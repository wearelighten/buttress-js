'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file socket-app.js
 * @description Entry point for socket app
 * @module Model
 * @author Chris Bates-Keegan
 *
 */

const Config = require('./config')(process.cwd() + '/../');
const Logging = require('./logging');
const Bootstrap = require('./bootstrap');

/**
 *
 */

Logging.setLogApp('socket');

Bootstrap
  .socket()
  .then(isMaster => {
    if (isMaster) {
      Logging.log(`${Config.app.title} Socket Master v${Config.app.version} listening on port ` +
        `${Config.listenPorts.sock} in ${Config.env} mode.`);
    } else {
      Logging.log(`${Config.app.title} Socket Worker v${Config.app.version} in ${Config.env} mode.`);
    }
  })
  .catch(Logging.Promise.logError());
