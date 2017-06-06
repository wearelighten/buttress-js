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
const Config = require('./config');
const Logging = require('./logging');

/**
 *
 */

Logging.setLogApp('rest');

mongoose.connect(`mongodb://${Config.mongoDb.url}/${Config.app.code}-${Config.env}`)
  .then(() => {
    return Bootstrap.rest();
  })
  .then(isMaster => {
    if (isMaster) {
      Logging.log(`${Config.app.title} REST Server Master v${Config.app.version} listening on port ` +
        `${Config.listenPort} in ${Config.env} mode.`);
    } else {
      Logging.log(`${Config.app.title} REST Server Worker v${Config.app.version} ` +
        `in ${Config.env} mode.`);
    }
  })
  .catch(Logging.Promise.logError());
