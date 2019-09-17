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

class BootstrapSocket {
	constructor() {
		Logging.setLogLevel(Logging.Constants.LogLevel.INFO);

		this.processes = os.cpus().length;
		this.workers = [];

		this.__apps = [];
		this.__tokens = [];
		this.__namespace = {};

		this.__superApps = [];

		this.isPrimary = Config.sio.app === 'primary';

		this.emitter = null;

		let socketInitTask = null;
		if (cluster.isMaster) {
			socketInitTask = (db) => this.__initMaster(db);
		} else {
			socketInitTask = (db) => this.__initWorker(db);
		}

		return this.__nativeMongoConnect()
			.then(socketInitTask)
			.then(() => cluster.isMaster);
	}

	__initMaster(db) {
		const nrp = new NRP(Config.redis);

		this.emitter = sioEmitter(Config.redis);

		if (this.isPrimary) {
			Logging.logDebug(`Primary Master`);
			nrp.on('activity', (data) => this.__onActivityReceived(data));
		}

		return this.__initMongoConnect()
			.then((db) => {
			// Load Apps
				return new Promise((resolve, reject) => {
					Model.App.findAll().toArray((err, _apps) => {
						if (err) reject(err);
						resolve(this.__apps = _apps);
					});
				});
			})
			.then(() => {
			// Load Tokens
				return new Promise((resolve, reject) => {
					Model.Token.findAll().toArray((err, _tokens) => {
						if (err) reject(err);
						resolve(this.__tokens = _tokens);
					});
				});
			})
			.then(() => {
			// Spawn worker processes, pass through build app objects
				this.__apps.map((app) => {
					const token = this.__tokens.find((t) => {
						return app._token && t._id.equals(app._token);
					});
					if (!token) {
						Logging.logWarn(`No Token found for ${app.name}`);
						return null;
					}

					app.token = token;
					app.publicId = Model.App.genPublicUID(app.name, app._id);

					const isSuper = token.authLevel > 2;
					Logging.logSilly(`Name: ${app.name}, App ID: ${app._id}, Public ID: ${app.publicId}`);
					Logging.log(`Public ID: ${app.name}, ${app.publicId}, ${(isSuper) ? 'SUPER' : ''}`);

					if (isSuper) {
						this.__namespace[app.publicId] = {
							emitter: this.emitter.of(`/${app.publicId}`),
							sequence: 0,
						};
						this.__superApps.push(app.publicId);
					}

					return app;
				}).filter((app) => app);

				this.__spawnWorkers({
					apps: this.__apps,
					tokens: this.__tokens,
				});
			});
	}

	__initWorker() {
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
					namespace.push(this.__initSocketNamespace(io, app.publicId, appTokens));
				});
			}
		});
	}

	__onActivityReceived(data) {
		const publicId = data.appPId;
		Logging.logDebug(`[${data.appPId}]: [${data.verb}] ${data.path}`);

		if (!this.emitter) {
			throw new Error('SIO Emitter isn\'t defined');
		}

		// Super apps?
		this.__superApps.forEach((superPublicId) => {
			this.__namespace[superPublicId].sequence++;
			this.__namespace[superPublicId].emitter.emit('db-activity', {
				data: data,
				sequence: this.__namespace[superPublicId].sequence,
			});
		});

		// Disable broadcasting to public space
		if (data.broadcast === false) {
			Logging.logDebug(`[${data.appPId}]: ${data.verb} ${data.path} - Early out as it isn't public.`);
			return;
		}
		// Don't emit activity if activity has super app PId, as it's already been sent
		if (this.__superApps.includes(publicId)) {
			Logging.logDebug(`[${data.appPId}]: ${data.verb} ${data.path} - Early out on super app activity`);
			return;
		}

		// Broadcast on requested channel
		if (!this.__namespace[publicId]) {
			this.__namespace[publicId] = {
				emitter: this.emitter.of(`/${publicId}`),
				sequence: 0,
			};
		}

		this.__namespace[publicId].sequence++;
		this.__namespace[publicId].emitter.emit('db-activity', {
			data: data,
			sequence: this.__namespace[publicId].sequence,
		});
	}

	__spawnWorkers(appTokens) {
		Logging.log(`Spawning ${this.processes} Socket Workers`);

		const __spawn = (idx) => {
			this.workers[idx] = cluster.fork();
			this.workers[idx].send({'buttress:initAppTokens': appTokens});
		};

		for (let x = 0; x < this.processes; x++) {
			__spawn(x);
		}

		net.createServer({pauseOnConnect: true}, (connection) => {
			const worker = this.workers[this.__indexFromIP(connection.remoteAddress, this.processes)];
			worker.send('buttress:connection', connection);
		}).listen(Config.listenPorts.sock);
	}

	__initSocketNamespace(io, publicId, appTokens) {
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
	}

	__indexFromIP(ip, spread) {
		let s = '';
		for (let i = 0, _len = ip.length; i < _len; i++) {
			if (!isNaN(ip[i])) {
				s += ip[i];
			}
		}

		return Number(s) % spread;
	}

	__nativeMongoConnect(app) {
		const dbName = `${Config.app.code}-${Config.env}`;
		const mongoUrl = `mongodb://${Config.mongoDb.url}/?authMechanism=DEFAULT&authSource=${dbName}`;
		return MongoClient.connect(mongoUrl, Config.mongoDb.options) // eslint-disable-line camelcase
			.then((client) => {
				return client.db(dbName);
			});
	}
	__initMongoConnect() {
		return this.__nativeMongoConnect()
			.then((db) => {
				Model.init(db);
				return db;
			})
			.catch((e) => Logging.logError(e));
	}
}

module.exports = BootstrapSocket;
