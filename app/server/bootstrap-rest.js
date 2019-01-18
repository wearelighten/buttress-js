'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file bootstrap-rest.js
 * @description
 * @module Config
 * @author Chris Bates-Keegan
 *
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const cluster = require('cluster');
const express = require('express');
const methodOverride = require('method-override');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const Config = require('node-env-obj')('../');
const Model = require('./model');
const Routes = require('./routes');
const Logging = require('./logging');
const MongoClient = require('mongodb').MongoClient;
const NRP = require('node-redis-pubsub');
const shortId = require('./helpers').ShortId;

Error.stackTraceLimit = Infinity;

/* ********************************************************************************
 *
 *
 *
 **********************************************************************************/
const processes = os.cpus().length;
// const processes = 1;
const _workers = [];

/* ********************************************************************************
 *
 * WORKERS
 *
 **********************************************************************************/
const __spawnWorkers = () => {
	Logging.logVerbose(`Spawning ${processes} REST Workers`);

	const __spawn = idx => {
		_workers[idx] = cluster.fork();
	};

	for (let x = 0; x < processes; x++) {
		__spawn(x);
	}
};

/* ********************************************************************************
 *
 * INSTALL
 *
 **********************************************************************************/
const __systemInstall = () => {
	let isInstalled = false;

	Logging.log('Checking for existing apps.');

	return Model.App.findAll().toArray()
		.then(apps => {
			if (apps.length > 0) {
				isInstalled = true;
				Logging.log('Existing apps found - Skipping install.');
				return {app: apps[0], token: null}; // If any apps, assume we've got a Super Admin app
			}

			Logging.log('No apps found - Creating super app.');
			return Model.App.add({
				name: `${Config.app.title} ADMIN`,
				type: Model.App.Constants.Type.SERVER,
				authLevel: Model.Token.Constants.AuthLevel.SUPER,
				permissions: [{route: '*', permission: '*'}],
				domain: ''
			});
		})
		.then(res => {
			if (isInstalled) {
				return res.app;
			}

			const pathName = path.join(Config.paths.appData, 'super.json');
			Logging.log(`Super app created: ${res.app.id}`);
			return new Promise((resolve, reject) => {
				let app = Object.assign(res.app, {token: res.token.value});
				fs.writeFile(pathName, JSON.stringify(app), err => {
					if (err) {
						return reject(err);
					}
					Logging.log(`Created ${pathName}`);

					resolve(res.app);
				});
			});
		});
};

/* ********************************************************************************
 *
 * MONGODB
 *
 **********************************************************************************/
const __nativeMongoConnect = app => {
	const dbName = `${Config.app.code}-${Config.env}`;
	const mongoUrl = `mongodb://${Config.mongoDb.url}/?authMechanism=DEFAULT&authSource=${dbName}`;
	return MongoClient.connect(mongoUrl, Config.mongoDb.options)
		.then(client => {
			return client.db(dbName);
		})
		.catch(Logging.Promise.logError());
};

/* ********************************************************************************
 *
 * WORKER
 *
 **********************************************************************************/
const __initWorker = () => {
	let app = express();
	app.use(morgan('short'));
	app.enable('trust proxy', 1);
	app.use(bodyParser.json({limit: '20mb'}));
	app.use(bodyParser.urlencoded({extended: true}));
	app.use(methodOverride());
	app.use(express.static(`${Config.paths.appData}/public`));

	process.on('unhandledRejection', error => {
		Logging.logError(error);
	});

	process.on('message', payload => {
		Logging.logDebug(`App Metadata Changed: ${payload.appId}`);
		Model.appMetadataChanged = true;
	});

	return __nativeMongoConnect()
		.then(db => {
			Model.init(db);

			let tasks = [
				Routes.init(app)
			];

			app.listen(Config.listenPorts.rest);

			return Promise.all(tasks);
		})
		.catch(Logging.Promise.logError());
};

/* ********************************************************************************
 *
 * MASTER
 *
 **********************************************************************************/
const __initMaster = () => {
	const isPrimary = Config.rest.app === 'primary';
	let p = Promise.resolve();

	if (isPrimary) {
		Logging.logVerbose(`Primary Master REST`);
		p = __nativeMongoConnect()
			.then(db => Model.initCoreModels(db))
			.then(() => __systemInstall())
			.then(() => Model.App.findAll().toArray())
			.then(apps => {
				let schemaUpdates = [];

				// Load local defined schemas into super app
				const coreSchema = _getLocalSchemas();
				apps.forEach(app => {
					const appSchema = app.__schema;
					const appShortId = shortId(app._id);
					Logging.log(`Updating ${coreSchema.length} core schema for ${appShortId}:${app.name}:${appSchema.length}`);
					coreSchema.forEach(cS => {
						const appSchemaIdx = appSchema.findIndex(s => s.name === cS.name);
						let schema = appSchema[appSchemaIdx];
						if (!schema) {
							return appSchema.push(cS);
						}
						schema.properties = Object.assign(schema.properties, cS.properties);
						appSchema[appSchemaIdx] = schema;
					});

					schemaUpdates.push(() => Model.App.updateSchema(app, appSchema));
				});

				return schemaUpdates.reduce((prev, task) => {
					return prev.then(() => task());
				}, Promise.resolve());
			})
			.then(() => Model.initSchema())
			.catch(e => Logging.logError(e));
	} else {
		Logging.logVerbose(`Secondary Master REST`);
	}

	const nrp = new NRP(Config.redis);
	nrp.on('app-metadata:changed', data => {
		Logging.logDebug(`App Metadata Changed: ${data.appId}, ${_workers.length} Workers`);
		_workers.forEach(w => {
			w.send({
				appId: data.appId
			});
		});
	});

	p.then(__spawnWorkers);

	return p;
};

/**
 * @return {Array} - content of json files loaded from local system
 */
function _getLocalSchemas() {
	let filenames = fs.readdirSync(`${__dirname}/schema`);

	let files = [];
	for (let x = 0; x < filenames.length; x++) {
		let file = filenames[x];
		if (path.extname(file) === '.json') {
			files.push(require(`${__dirname}/schema/${path.basename(file, '.js')}`));
		}
	}
	return files;
}

/* ********************************************************************************
 *
 * RHIZOME REST
 *
 **********************************************************************************/
const _initRestApp = () => {
	let p = null;
	if (cluster.isMaster) {
		p = __initMaster();
	} else {
		p = __initWorker();
	}

	return p.then(() => cluster.isMaster);
};

/* ********************************************************************************
 *
 * EXPORTS
 *
 **********************************************************************************/
module.exports = {
	init: _initRestApp
};
