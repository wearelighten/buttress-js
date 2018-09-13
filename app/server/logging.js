'use strict';

/**
 * ButtressJS - Realtime datastore for business software
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

const cluster = require('cluster');
const proxyquire = require('proxyquire');
const winston = require('winston');
proxyquire('winston-logrotate', {
  winston: winston
});
const Config = require('node-env-obj')('../');

/**
 *
 * @type {{ERR: string, WARN: string, INFO: string, VERBOSE: string, DEBUG: string, SILLY: string, DEFAULT: string}}
 */
const LogLevel = {
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

let _logApp = 'app';
let _logLabel = '';
module.exports.setLogApp = app => {
  _logApp = app;
  if (cluster.isWorker) {
    _logLabel = `${cluster.worker.id}`;
  }
};

/**
 * @param {String} logApp - Log applcation label (rest / socket)
 */
module.exports.init = logApp => {
  this.setLogApp(logApp);

  winston.remove(winston.transports.Console);
  winston.add(winston.transports.Console, {
    name: 'console',
    colorize: 'all',
    timestamp: true,
    level: 'info'
  });

  winston.add(winston.transports.Rotate, {
    name: 'debug-file',
    json: false,
    file: `${Config.paths.logs}/log-${_logApp}-debug.log`,
    level: 'debug',
    size: '1m',
    keep: 2,
    colorize: 'all',
    timestamp: true
  });
  winston.add(winston.transports.Rotate, {
    name: 'info-file',
    json: false,
    file: `${Config.paths.logs}/log-${_logApp}-info.log`,
    size: '1m',
    keep: 5,
    colorize: 'all',
    level: 'info',
    timestamp: true
  });
  winston.add(winston.transports.Rotate, {
    name: 'error-file',
    json: false,
    file: `${Config.paths.logs}/log-${_logApp}-err.log`,
    size: '1m',
    keep: 10,
    level: 'error',
    colorize: 'none',
    timestamp: true
  });
  winston.add(winston.transports.Rotate, {
    name: 'silly-file',
    json: false,
    file: `${Config.paths.logs}/log-${_logApp}-silly.log`,
    level: 'silly',
    size: '1m',
    keep: 1,
    colorize: 'all',
    timestamp: true
  });
  winston.addColors({
    info: 'white',
    error: 'red',
    warn: 'yellow',
    verbose: 'white',
    debug: 'white'
  });
};

/**
 *
 * @param {string} log - log entry
 * @param {string} level - level to log at
 * @private
 */
function _log(log, level) {
  winston.log(level, `[${_logLabel}]: ${log}`);
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
 * @param {string} level - level to log at
 */
module.exports.log = (log, level) => {
  level = level || LogLevel.DEFAULT;
  _log(log, level);
};

/**
 * @param {string} log - Text to log
 */
module.exports.logVerbose = log => {
  module.exports.log(log, LogLevel.VERBOSE);
};

/**
 * @param {string} log - Text to log
 */
module.exports.logDebug = log => {
  module.exports.log(log, LogLevel.DEBUG);
};

/**
 * @param {string} log - Text to log
 */
module.exports.logSilly = log => {
  module.exports.log(log, LogLevel.SILLY);
};

/**
 * @param {string} warn - warning to log
 */
module.exports.logWarn = warn => {
  _log(warn, LogLevel.WARN);
};
/**
 * @param {string} err - error object to log
 */
module.exports.logError = err => {
  _log(err.message, LogLevel.ERR);
  _log(err.stack, LogLevel.ERR);
};

/**
 * @param {string} log - Text to log
 * @param {Object} timer - Object with an 'interval' property
 * @param {string} level - level to log at
 */
module.exports.logTimer = (log, timer, level) => {
  level = level || LogLevel.INFO;
  _log(`${log} [${timer.interval.toFixed(6)}s]`, level);
};

/**
 * @param {string} log - Text to log
 * @param {Object} timer - Object with an 'interval' property
 * @param {string} time - time above which to log the exception
 */
module.exports.logTimerException = (log, timer, time) => {
  let level = LogLevel.ERR;
  if (timer.interval > time) {
    _log(`${log} ${timer.interval.toFixed(3)}s`, level);
  }
};

/**
 * PROMISE LOGGING
 */

module.exports.Promise = {};

/**
 * @param {string} log - Text to log
 * @param {string} level - level to log at
 * @return {function(*)} - returns a function for chaining into a promise
 */
module.exports.Promise.log = (log, level) => {
  level = level || LogLevel.DEFAULT;
  return res => {
    if (res instanceof Object) {
      _log(`${log}:`, level);
      _log(res.toObject ? res.toObject() : res, level);
    } else {
      _log(`${log}: ${res}`, level);
    }
    return res;
  };
};

/**
 * @param {string} log - Text to log
 * @param {*} val - value to test `res` against
 * @param {string} level - level to log at
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
 * @param {string} level - level to log at
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
 * @param {string} level - level to log at
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
 * @param {string} level - level to log at
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
 * @param {string} level - level to log at
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
 * @param {string} level - level to log at
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
 * @param {string} level - level to log at
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

/**
 * @return {function(*)} - returns a function for chaining into a promise
 */
module.exports.Promise.logError = () => {
  const level = LogLevel.ERR;
  return err => {
    _log(err.message, level);
    _log(err.stack, level);
    return err;
  };
};

/**
 * @param {string} log - Text to log
 * @return {function(*)} - returns a function for chaining into a promise
 */
module.exports.Promise.logInfo = log => {
  const level = LogLevel.INFO;
  return module.exports.Promise.log(log, level);
};

/**
 * @param {string} log - Text to log
 * @return {function(*)} - returns a function for chaining into a promise
 */
module.exports.Promise.logVerbose = log => {
  const level = LogLevel.VERBOSE;
  return module.exports.Promise.log(log, level);
};

/**
 * @param {string} log - Text to log
 * @return {function(*)} - returns a function for chaining into a promise
 */
module.exports.Promise.logDebug = log => {
  const level = LogLevel.DEBUG;
  return module.exports.Promise.log(log, level);
};

/**
 * @param {string} log - Text to log
 * @return {function(*)} - returns a function for chaining into a promise
 */
module.exports.Promise.logSilly = log => {
  const level = LogLevel.SILLY;
  return module.exports.Promise.log(log, level);
};

/**
 * @param {string} log - Text to log
 * @param {Object} timer - Object with an 'interval' property
 * @param {string} level - level to log at
 * @return {function(*)} - returns a function for chaining into a promise
 */
module.exports.Promise.logTimer = (log, timer, level) => {
  level = level || LogLevel.INFO;
  return res => {
    _log(`${log} [${timer.lapTime.toFixed(6)}s] [${timer.interval.toFixed(6)}s]`, level);
    return res;
  };
};

/**
 * @param {string} log - Text to log
 * @param {Object} timer - Object with an 'interval' property
 * @param {string} time - time above which to log the exception
 * @return {function(*)} - returns a function for chaining into a promise
 */
module.exports.Promise.logTimerException = (log, timer, time) => {
  let level = LogLevel.ERR;
  return res => {
    if (timer.interval > time) {
      _log(`${log} ${timer.interval.toFixed(3)}s`, level);
    }

    return res;
  };
};
