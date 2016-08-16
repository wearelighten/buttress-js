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

const logFormat = Date.ISO8601_DATETIME;
var logPrefix = module.exports.logPrefix = () => {
  Date.create().format(logFormat);
};

/**
 *
 * @param {string} string - log entry
 * @private
 */
function _log(string) {
  console.log(string);
}

/**
 * STANDARD LOGGING
 */

/**
 * @param {string} log - Text to log
 * @return {function(*)} - returns a function for chaining into a promise
 */
module.exports.log = log => {
  return res => {
    _log(`${logPrefix()} - ${log}: ${res}`);
    return res;
  };
};

/**
 * @param {string} log - Text to log
 * @param {*} val - value to test `res` against
 * @return {function(*)} - returns a function for chaining into a promise
 */
module.exports.logIf = (log, val) => {
  return res => {
    if (val === res) {
      _log(`${logPrefix()} - ${log}: ${res}`);
    }
    return res;
  };
};

/**
 * @param {string} log - Text to log
 * @param {*} val - value to test `res` against
 * @return {function(*)} - returns a function for chaining into a promise
 */
module.exports.logIfNot = (log, val) => {
  return res => {
    if (val !== res) {
      _log(`${logPrefix()} - ${log}: ${res}`);
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
 * @return {function(*)} - returns a function for chaining into a promise
 */
module.exports.logProp = (log, prop) => {
  return res => {
    _log(`${logPrefix()} - ${log}: ${res[prop]}`);
    return res;
  };
};

/**
 * @param {string} log - Text to log
 * @param {string} prop - Name of the `res` property to log
 * @param {*} val - value to test `res` against
 * @return {function(*)} - returns a function for chaining into a promise
 */
module.exports.logPropIf = (log, prop, val) => {
  return res => {
    if (val === res[prop]) {
      _log(`${logPrefix()} - ${log}: ${res[prop]}`);
    }
    return res;
  };
};

/**
 * @param {string} log - Text to log
 * @param {string} prop - Name of the `res` property to log
 * @param {*} val - value to test `res` against
 * @return {function(*)} - returns a function for chaining into a promise
 */
module.exports.logPropIfNot = (log, prop, val) => {
  return res => {
    if (val !== res[prop]) {
      _log(`${logPrefix()} - ${log}: ${res[prop]}`);
    }
    return res;
  };
};

/**
 * ARRAY LOGGING
 */

/**
 * @param {string} log - Text to log
 * @return {function(*)} - returns a function for chaining into a promise
 */
module.exports.logArray = log => {
  return res => {
    console.log(`${logPrefix()} - ${log}: ${res.length}`);
    res.forEach(r => {
      _log(r);
    });
    return res;
  };
};

/**
 * @param {string} log - Text to log
 * @param {string} prop - Name of the `res[]` property to log
 * @return {function(*)} - returns a function for chaining into a promise
 */
module.exports.logArrayProp = (log, prop) => {
  return res => {
    console.log(`${logPrefix()} - ${log}: ${res.length}`);
    res.forEach(r => {
      _log(r[prop]);
    });
    return res;
  };
};
