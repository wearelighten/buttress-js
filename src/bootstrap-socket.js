'use strict';

/**
 * ButtressJS - Realtime datastore for software
 *
 * @file bootstrap-socket.js
 * @description Bootstrap the socket app
 * @module Model
 * @author Chris Bates-Keegan
 *
 */
const os = require('os');
const cluster = require('cluster');
const net = require('net');
const Express = require('express');
const sio = require('socket.io');
const sioRedis = require('socket.io-redis');
const sioEmitter = require('socket.io-emitter');

const Config = require('node-env-obj')('../');
const Model = require('./model');
const Logging = require('./logging');
const MongoClient = require('mongodb').MongoClient;
// const ObjectId = require('mongodb').ObjectId;
const NRP = require('node-redis-pubsub');

/* ********************************************************************************
 *
 *
 *
 **********************************************************************************/
// const processes = os.cpus().length;
const processes = 1;
const _workers = [];

/* ********************************************************************************
 *
 * HELPERS
 *
 **********************************************************************************/
const __indexFromIP = (ip, spread) => {
	let s = '';
	for (let i = 0, _len = ip.length; i < _len; i++) {
		if (!isNaN(ip[i])) {
			s += ip[i];
		}
	}

	return Number(s) % spread;
};

/* ********************************************************************************
 *
 * MONGODB
 *
 **********************************************************************************/
const __nativeMongoConnect = (app) => {
	const dbName = `${Config.app.code}-${Config.env}`;
	const mongoUrl = `mongodb://${Config.mongoDb.url}/?authMechanism=DEFAULT&authSource=${dbName}`;
	return MongoClient.connect(mongoUrl, Config.mongoDb.options) // eslint-disable-line camelcase
		.then((client) => {
			return client.db(dbName);
		});
};
const __initMongoConnect = () => {
	return __nativeMongoConnect()
		.then((db) => {
			Model.init(db);
			return db;
		})
		.catch((e) => Logging.logError(e));
};

/* ********************************************************************************
 *
 * WORKERS
 *
 **********************************************************************************/
const __spawnWorkers = (appTokens) => {
	Logging.log(`Spawning ${processes} Socket Workers`);

	const __spawn = (idx) => {
		_workers[idx] = cluster.fork();
		_workers[idx].send({'buttress:initAppTokens': appTokens});
	};

	for (let x = 0; x < processes; x++) {
		__spawn(x);
	}

	net.createServer({pauseOnConnect: true}, (connection) => {
		const worker = _workers[__indexFromIP(connection.remoteAddress, processes)];
		worker.send('buttress:connection', connection);
	}).listen(Config.listenPorts.sock);
};

const __initSocketNamespace = (io, publicId, appTokens) => {
	const namespace = io.of(`/${publicId}`);
	namespace.on('connect', (socket) => {
		const userToken = socket.handshake.query.token;
		const token = appTokens.tokens.find((t) => t.value === userToken);
		if (!token) {
			Logging.logDebug(`Invalid token, closing connection: ${socket.id}`);
			return socket.disconnect(0);
		}

		const app = appTokens.apps.find((a) => a.publicId === publicId);
		if (!app) {
			Logging.logDebug(`Invalid app, closing connection: ${socket.id}`);
			return socket.disconnect(0);
		}

		Logging.logSilly(`${socket.id} Connected on ${publicId}`);
		socket.on('disconnect', () => {
			Logging.logSilly(`${socket.id} Disconnect on ${publicId}`);
		});
	});

	return namespace;
};

const __initWorker = () => {
	const app = new Express();
	const server = app.listen(0, 'localhost');
	const io = sio(server);
	const namespace = [];
	io.origins('*:*');
	io.adapter(sioRedis(Config.redis));

	io.on('connect', (socket) => {
		Logging.logSilly(`${socket.id} Connected on global space`);
		socket.on('disconnect', (socket) => {
			Logging.logSilly(`${socket.id} Disconnect on global space`);
		});
	});

	process.on('message', (message, input) => {
		if (message === 'buttress:connection') {
			const connection = input;
			server.emit('connection', connection);
			connection.resume();
			return;
		}
		if (message['buttress:initAppTokens']) {
			const appTokens = message['buttress:initAppTokens'];
			appTokens.apps.forEach((app) => {
				namespace.push(__initSocketNamespace(io, app.publicId, appTokens));
			});
		}
	});
};

/* ********************************************************************************
 *
 * MASTER
 *
 **********************************************************************************/
const __initMaster = (express) => {
	const emitter = sioEmitter(Config.redis);
	const nrp = new NRP(Config.redis);

	let apps = [];
	let tokens = [];
	const namespace = {};

	const superApps = [];

	const isPrimary = Config.sio.app === 'primary';

	if (isPrimary) {
		Logging.logDebug(`Primary Master`);
		nrp.on('activity', (data) => {
			const publicId = data.appPId;
			Logging.logDebug(`[${data.appPId}]: [${data.verb}] ${data.path}`);

			// Super apps?
			superApps.forEach((superPublicId) => {
				namespace[superPublicId].sequence++;
				namespace[superPublicId].emitter.emit('db-activity', {
					data: data,
					sequence: namespace[superPublicId].sequence,
				});
			});

			// Disable broadcasting to public space
			if (data.broadcast === false) {
				Logging.logDebug(`[${data.appPId}]: ${data.verb} ${data.path} - Early out as it isn't public.`);
				return;
			}
			// Don't emit activity if activity has super app PId, as it's already been sent
			if (superApps.includes(publicId)) {
				Logging.logDebug(`[${data.appPId}]: ${data.verb} ${data.path} - Early out on super app activity`);
				return;
			}

			// Broadcast on requested channel
			if (!namespace[publicId]) {
				namespace[publicId] = {
					emitter: emitter.of(`/${publicId}`),
					sequence: 0,
				};
			}

			namespace[publicId].sequence++;
			namespace[publicId].emitter.emit('db-activity', {
				data: data,
				sequence: namespace[publicId].sequence,
			});
		});
	}

	__initMongoConnect()
		.then((db) => {
		// Load Apps
			return new Promise((resolve, reject) => {
				Model.App.findAll().toArray((err, _apps) => {
					if (err) reject(err);
					resolve(apps = _apps);
				});
			});
		})
		.then(() => {
		// Load Tokens
			return new Promise((resolve, reject) => {
				Model.Token.findAll().toArray((err, _tokens) => {
					if (err) reject(err);
					resolve(tokens = _tokens);
				});
			});
		})
		.then(() => {
		// Spawn worker processes, pass through build app objects
			apps.map((app) => {
				const token = tokens.find((t) => {
					return app._token && t._id.equals(app._token);
				});
				if (!token) {
					Logging.logWarn(`No Token found for ${app.name}`);
					return null;
				}

				app.token = token;
				app.publicId = Model.App.genPublicUID(app.name, app.id);
				const isSuper = token.authLevel > 2;
				Logging.logSilly(`Name: ${app.name}, Token: ${app.id}`);
				Logging.log(`Public ID: ${app.name}, ${app.publicId}, ${(isSuper) ? 'SUPER' : ''}`);

				if (isSuper) {
					namespace[app.publicId] = {
						emitter: emitter.of(`/${app.publicId}`),
						sequence: 0,
					};
					superApps.push(app.publicId);
				}

				return app;
			}).filter((app) => app);

			__spawnWorkers({
				apps: apps,
				tokens: tokens,
			});
		});
};

/* ********************************************************************************
 *
 * RHIZOME SOCKET
 *
 **********************************************************************************/
const _initSocketApp = () => {
	Logging.setLogLevel(Logging.Constants.LogLevel.SILLY);

	if (cluster.isMaster) {
		__initMaster();
	} else {
		__initWorker();
	}

	return Promise.resolve(cluster.isMaster);
};

/* ********************************************************************************
 *
 * EXPORTS
 *
 **********************************************************************************/
module.exports = {
	init: _initSocketApp,
};
