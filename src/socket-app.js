'use strict';

/**
 * ButtressJS - Realtime datastore for software
 *
 * @file socket-app.js
 * @description Entry point for socket app
 * @module Model
 * @author Chris Bates-Keegan
 *
 */

const Config = require('node-env-obj')('../');
const Logging = require('./logging');
const Bootstrap = require('./bootstrap');

/**
 *
 */

Logging.init('socket');

Bootstrap
	.socket()
	.then((isMaster) => {
		if (isMaster) {
			Logging.log(`${Config.app.title} Socket Master v${Config.app.version} listening on port ` +
				`${Config.listenPorts.sock} in ${Config.env} mode.`);
		} else {
			Logging.log(`${Config.app.title} Socket Worker v${Config.app.version} in ${Config.env} mode.`);
		}
	})
	.catch(Logging.Promise.logError());
