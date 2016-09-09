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
 * @class Config
 *
 */
class Config {
  constructor() {
    if (!process.env.RHIZOME_SERVER_ID) {
      throw new Error('You need to add config ' +
        'settings for your environment to config.json');
    }

    var _map = {
      development: 'dev',
      production: 'prod',
      test: 'test'
    };

    this._settings = this._loadSettings();
    this._settings.env = _map[process.env.NODE_ENV];
  }

  get settings() {
    return this._settings;
  }

  _loadSettings() {
    var json = fs.readFileSync('./config.json');
    var settings = JSON.parse(json);

    for (var variable in settings.local.environment) {
      if (!process.env[variable]) {
        throw new Error(`You must specify the ${variable} environment variable`);
      }
      settings.local.environment[variable] = process.env[variable];
    }

    return Object.assign(settings.global, settings.local.environment, settings.local[process.env.RHIZOME_SERVER_ID]);
  }
}

module.exports = (new Config()).settings;
