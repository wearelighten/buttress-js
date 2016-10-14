'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file config.js
 * @description
 * @module Config
 * @author Chris Bates-Keegan
 *
 */

var fs = require('fs');

/**
 * @type {{development: string, production: string, test: string}}
 * @private
 */
var _map = {
  development: 'dev',
  production: 'prod',
  test: 'test'
};

var _env = process.env.NODE_ENV ? process.env.NODE_ENV : 'development';

/**
 * @class Config
 *
 */
class Config {
  constructor() {
    if (!process.env.RHIZOME_SERVER_ID) {
      throw new Error('You need to add config ' +
        'settings for your environment to config.json');
    }

    this._settings = this._loadSettings();
    this._settings.env = _map[process.env.NODE_ENV];
  }

  get settings() {
    return this._settings;
  }

  _loadSettings() {
    var json = fs.readFileSync('./config.json');
    var settings = JSON.parse(json);

    var variable;
    for (variable in settings.local.environment) {
      if (!process.env[variable]) {
        throw new Error(`You must specify the ${variable} environment variable`);
      }
      settings.local.environment[variable] = process.env[variable];
    }

    var local = settings.local[process.env.RHIZOME_SERVER_ID];
    for (variable in local) {
      if (local[variable] instanceof Object && local[variable][_map[_env]]) {
        local[variable] = local[variable][_map[_env]];
      }
    }

    return Object.assign(settings.global, settings.local.environment, local);
  }
}

module.exports = (new Config()).settings;
