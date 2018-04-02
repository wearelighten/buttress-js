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
const _regEx = /%(\w+)%/g;

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
      const matches = root[variable].match(_regEx);
      if (matches) {
        matches.forEach(match => {
          const key = match.replace(/%/g, '');
          root[variable] = root[variable].replace(`%${key}%`, env[key]);
        });
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
 * @param  {String} data - environment variables data
 * @return {Object} contained key-values for environment variables
 */
const __parseEnvFile = data => {
  return data.split('\n').reduce((obj, line) => {
    let lineSplit = line.split('=');
    if (lineSplit.length > 0) {
      const key = lineSplit.shift();
      const value = lineSplit.join('=');
      if (key === '' || key.indexOf('#') >= 0) return obj;
      obj[key] = value;
    }
    return obj;
  }, {});
};

/**
 * @class Config
 *
 */
class Config {
  constructor(path) {
    const basePath = path ? path : __dirname;
    const envPath = `${basePath}/.${_env}.env`;

    if (fs.existsSync(envPath)) {
      const envFileData = __parseEnvFile(fs.readFileSync(envPath, {encoding: 'utf8'}));
      Object.keys(envFileData).forEach(key => {
        process.env[key] = envFileData[key];
      });
    }

    this._settings = Config._loadSettings(process.env);
    this._settings.env = _map[this._settings.env];
  }

  get settings() {
    return this._settings;
  }

  static _loadSettings(env) {
    let json = fs.readFileSync(`${__dirname}/config.json`);
    let settings = JSON.parse(json);

    let variable;
    for (variable in settings.environment) {
      if (!settings.environment.hasOwnProperty(variable)) { // eslint-disable-line no-prototype-builtins
        continue;
      }
      if (!env[variable] && !settings.environment[variable]) {
        console.warn(`WARN: You must specify the ${variable} environment variable`);
      }
      if (env[variable]) {
        settings.environment[variable] = env[variable];
      }
    }

    __parse(settings.global);
    __recurseVars(settings.environment, settings.global);

    return settings.global;
  }
}

module.exports = args => new Config(args).settings;
