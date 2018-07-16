'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file app.js
 * @description
 * @module System
 * @author Chris Bates-Keegan
 *
 */

const mongoose = require('mongoose');
const Bootstrap = require('./bootstrap');
const Config = require('node-env-obj')('../');
const Logging = require('./logging');

/**
 *
 */

Logging.init('rest');

mongoose.Promise = global.Promise;
mongoose.connection.on('error', () => mongoose.disconnect());
mongoose.connect(`mongodb://${Config.mongoDb.url}/${Config.app.code}-${Config.env}`, Config.mongoDb.options)
  .then(() => {
    return Bootstrap.rest();
  })
  .then(isMaster => {
    if (isMaster) {
      Logging.log(`${Config.app.title} REST Server Master v${Config.app.version} listening on port ` +
        `${Config.listenPorts.rest} in ${Config.env} mode.`);
    } else {
      Logging.log(`${Config.app.title} REST Server Worker v${Config.app.version} ` +
        `in ${Config.env} mode.`);
    }
  })
  .catch(Logging.Promise.logError());
