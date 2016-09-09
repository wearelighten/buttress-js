'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file logging.js
 * @description Logging helpers
 * @module System
 * @author Chris Bates-Keegan
 *
 * @todo Centralise this logging across the app
 * @todo Add other log targets ie to datastore
 *
 */

const proxyquire = require('proxyquire');
const winston = require('winston');
proxyquire('winston-logrotate', {
  winston: winston
});
const Config = require('./config');
require('sugar');

/**
 *
 * @type {{ERR: string, WARN: string, INFO: string, VERBOSE: string, DEBUG: string, SILLY: string, DEFAULT: string}}
 */
var LogLevel = {
  ERR: 'error',
  WARN: 'warn',
  INFO: 'info',
  VERBOSE: 'verbose',
  DEBUG: 'debug',
  SILLY: 'silly',
  DEFAULT: 'info'
};

module.exports.Constants = {
  LogLevel: LogLevel
};

const logFormat = Date.ISO8601_DATETIME;

/**
 *
 */
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {
  colorize: 'all',
  timestamp: () => Date.create().format(logFormat),
  level: LogLevel.INFO
});

winston.add(winston.transports.Rotate, {
  name: 'debug-file',
  json: false,
  file: `${Config.logPath}/log-debug.log`,
  level: 'debug',
  keep: 2,
  timestamp: true
});
winston.add(winston.transports.Rotate, {
  name: 'verbose-file',
  json: false,
  file: `${Config.logPath}/log-verbose.log`,
  level: 'verbose',
  timestamp: true
});
winston.add(winston.transports.Rotate, {
  name: 'error-file',
  json: false,
  file: `${Config.logPath}/log-err.log`,
  level: 'err',
  timestamp: true
});
winston.addColors({
  info: 'white',
  error: 'red',
  warn: 'yellow',
  verbose: 'white',
  debug: 'white'
});

/**
 *
 * @param {string} log - log entry
 * @param {integer} level - level to log at
 * @private
 */
function _log(log, level) {
  winston.log(level, log);
  // if (typeof log === 'string') {
  //   winston.log(level, log);
  // } else {
  //   winston.log(level, '', log);
  // }
}

/**
 * STANDARD LOGGING
 */

module.exports.setLogLevel = level => {
  winston.level = level;
  // _logLevel = level;
};

/**
 * @param {string} log - Text to log
 * @param {integer} level - level to log at
 */
module.exports.log = (log, level) => {
  level = level || LogLevel.DEFAULT;
  _log(log, level);
};

/**
 * PROMISE LOGGING
 */

module.exports.Promise = {};

/**
 * @param {string} log - Text to log
 * @param {integer} level - level to log at
 * @return {function(*)} - returns a function for chaining into a promise
 */
module.exports.Promise.log = (log, level) => {
  level = level || LogLevel.DEFAULT;
  return res => {
    _log(`${log}: ${res}`, level);
    return res;
  };
};

/**
 * @param {string} log - Text to log
 * @param {*} val - value to test `res` against
 * @param {integer} level - level to log at
 * @return {function(*)} - returns a function for chaining into a promise
 */
module.exports.Promise.logIf = (log, val, level) => {
  level = level || LogLevel.DEFAULT;
  return res => {
    if (val === res) {
      _log(`${log}: ${res}`, level);
    }
    return res;
  };
};

/**
 * @param {string} log - Text to log
 * @param {*} val - value to test `res` against
 * @param {integer} level - level to log at
 * @return {function(*)} - returns a function for chaining into a promise
 */
module.exports.Promise.logIfNot = (log, val, level) => {
  level = level || LogLevel.DEFAULT;
  return res => {
    if (val !== res) {
      _log(`${log}: ${res}`, level);
    }
    return res;
  };
};

/**
 * PROPERTY LOGGING
 */

/**
 * @param {string} log - Text to log
 * @param {string} prop - Name of the `res` property to log
 * @param {integer} level - level to log at
 * @return {function(*)} - returns a function for chaining into a promise
 */
module.exports.Promise.logProp = (log, prop, level) => {
  level = level || LogLevel.DEFAULT;
  return res => {
    _log(`${log}: ${res[prop]}`, level);
    return res;
  };
};

/**
 * @param {string} log - Text to log
 * @param {string} prop - Name of the `res` property to log
 * @param {*} val - value to test `res` against
 * @param {integer} level - level to log at
 * @return {function(*)} - returns a function for chaining into a promise
 */
module.exports.Promise.logPropIf = (log, prop, val, level) => {
  level = level || LogLevel.DEFAULT;
  return res => {
    if (val === res[prop]) {
      _log(`${log}: ${res[prop]}`, level);
    }
    return res;
  };
};

/**
 * @param {string} log - Text to log
 * @param {string} prop - Name of the `res` property to log
 * @param {*} val - value to test `res` against
 * @param {integer} level - level to log at
 * @return {function(*)} - returns a function for chaining into a promise
 */
module.exports.Promise.logPropIfNot = (log, prop, val, level) => {
  level = level || LogLevel.DEFAULT;
  return res => {
    if (val !== res[prop]) {
      _log(`${log}: ${res[prop]}`, level);
    }
    return res;
  };
};

/**
 * ARRAY LOGGING
 */

/**
 * @param {string} log - Text to log
 * @param {integer} level - level to log at
 * @return {function(*)} - returns a function for chaining into a promise
 */
module.exports.Promise.logArray = (log, level) => {
  level = level || LogLevel.DEFAULT;
  return res => {
    _log(`${log}: ${res.length}`, level);
    res.forEach(r => {
      _log(r);
    });
    return res;
  };
};

/**
 * @param {string} log - Text to log
 * @param {string} prop - Name of the `res[]` property to log
 * @param {integer} level - level to log at
 * @return {function(*)} - returns a function for chaining into a promise
 */
module.exports.Promise.logArrayProp = (log, prop, level) => {
  level = level || LogLevel.DEFAULT;
  return res => {
    _log(`${log}: ${res.length}`, level);
    res.forEach(r => {
      _log(r[prop]);
    });
    return res;
  };
};
