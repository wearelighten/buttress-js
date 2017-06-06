'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file config.js
 * @description
 * @module Config
 * @author Chris Bates-Keegan
 *
 */

const fs = require('fs');

/**
 * @type {{development: string, production: string, test: string}}
 * @private
 */
const _map = {
  development: 'dev',
  production: 'prod',
  test: 'test'
};

const _env = process.env.NODE_ENV ? process.env.NODE_ENV : 'development';
const _regEx = /^%(\w+)%/;

/**
 * @param  {Object} env - environment variables
 * @param  {Object|Array} root - root object
 */
const __recurseVars = (env, root) => {
  for (let variable in root) {
    if (!root.hasOwnProperty(variable)) { // eslint-disable-line no-prototype-builtins
      continue;
    }

    if (root[variable] instanceof Object) {
      __recurseVars(env, root[variable]);
    } else if (root[variable] instanceof Array) {
      __recurseVars(env, root[variable]);
    } else if (typeof root[variable] === 'string') {
      const match = _regEx.exec(root[variable]);
      if (match) {
        root[variable] = root[variable].replace(`%${match[1]}%`, env[match[1]]);
      }
    }
  }
};

/**
 * @param  {Object} object - environment variables
 */
const __parse = object => {
  if (object instanceof Object === false) {
    return;
  }

  for (let variable in object) {
    if (!object.hasOwnProperty(variable)) { // eslint-disable-line no-prototype-builtins
      continue;
    }
    if (object[variable] instanceof Object) {
      if (object[variable][_map[_env]]) {
        object[variable] = object[variable][_map[_env]];
      } else {
        __parse(object[variable]);
      }
    }
  }
};

/**
 * @class Config
 *
 */
class Config {
  constructor() {
    this._settings = Config._loadSettings();
    this._settings.env = _map[this._settings.env];
  }

  get settings() {
    return this._settings;
  }

  static _loadSettings() {
    let json = fs.readFileSync('./config.json');
    let settings = JSON.parse(json);

    let variable;
    for (variable in settings.environment) {
      if (!settings.environment.hasOwnProperty(variable)) { // eslint-disable-line no-prototype-builtins
        continue;
      }
      if (!process.env[variable] && !settings.environment[variable]) {
        throw new Error(`You must specify the ${variable} environment variable`);
      }
      if (process.env[variable]) {
        settings.environment[variable] = process.env[variable];
      }
    }

    let local = settings.local[process.env.BUTTRESS_SERVER_ID];
    if (!local) {
      throw new Error(`Missing local environment settings for BUTTRESS_SERVER_ID: ${process.env.BUTTRESS_SERVER_ID}`); // eslint-disable-line max-len
    }

    __parse(settings.global);
    __parse(local);
    __recurseVars(settings.environment, settings.global);
    __recurseVars(settings.environment, local);

    return Object.assign(settings.global, settings.local.environment, local);
  }
}

module.exports = (new Config()).settings;
