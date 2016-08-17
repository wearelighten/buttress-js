'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file logging.js
 * @description Logging helpers
 * @module System
 * @author Chris Bates-Keegan
 *
 */

var Config = require('../config');
var Logging = require('../logging');
var OTP = require('../stotp');
var _ = require('underscore');

/**
 */
var _otp = OTP.create({
  length: 12,
  mode: OTP.Constants.Mode.ALPHANUMERIC,
  salt: Config.RHIZOME_OTP_SALT,
  tolerance: 3
});

var _app = null;

/**
 * @type { {Auth: {NONE: string, SUPER: string, ADMIN: string, USER: string},
 *          Permissions: {READ: string, WRITE: string, BOTH: string},
 *          Verbs: {GET: string, POST: string, PUT: string, DEL: string}}}
 */
var Constants = {
  Auth: {
    NONE: '',
    SUPER: 'super',
    ADMIN: 'admin',
    USER: 'user'
  },
  Permissions: {
    READ: 'read',
    WRITE: 'write',
    BOTH: 'both'
  },
  Verbs: {
    GET: 'get',
    POST: 'post',
    PUT: 'put',
    DEL: 'del'
  }
};

class Route {
  constructor(path, name) {
    this.verb = Constants.Verbs.GET;
    this.auth = Constants.Auth.SUPER;
    this.permissions = Constants.Permissions.READ;

    this.path = path;
    this.name = name;
  }

  /**
   * @param {Object} req - ExpressJS request object
   * @param {Object} res - ExpresJS response object
   * @return {Promise} - Promise is fulfilled once execution has completed
   */
  exec(req, res) {
    this.req = req;
    this.res = res;

    return new Promise((resolve, reject) => {
      if (!this._exec) {
        this.log(`Error: ${this.name}: No _exec defined`, Logging.Constants.LogLevel.ERR);
        reject({statusCode: 500});
        return;
      }

      this.log(`STARTING: ${this.name}`);
      this._authenticate()
        .then(Logging.log('authenticated', Logging.Constants.LogLevel.VERBOSE))
        .then(_.bind(this._validate, this), reject)
        .then(Logging.log('validated', Logging.Constants.LogLevel.VERBOSE))
        .then(_.bind(this._exec, this), reject)
        .then(Logging.log('exec\'ed', Logging.Constants.LogLevel.VERBOSE))
        .then(resolve, reject);
    });
  }

  /**
   * @return {Promise} - Promise is fulfilled once the authentication is completed
   * @private
   */
  _authenticate() {
    return new Promise((resolve, reject) => {
      if (this.auth === Constants.Auth.NONE) {
        this.log(`WARN: OPEN API CALL`, Logging.Constants.LogLevel.WARN);
        resolve(this.req.user);
        return;
      }

      this.log(`Authenticate: ${this.auth}`);
      if (!this.req.user) {
        this.log('EAUTH: No logged in user', Logging.Constants.LogLevel.ERR);
        reject({statusCode: 401});
        return;
      }

      if (_otp.test(this.req.query.token) === false) {
        this.log('EAUTH: Invalid TOTP Token', Logging.Constants.LogLevel.ERR);
        reject({statusCode: 400});
      }

      resolve(this.req.user);
    });
  }

  /**
   * @param {string} log - log text
   * @param {enum} level - NONE, ERR, WARN, INFO
   */
  log(log, level) {
    level = level || Logging.Constants.LogLevel.INFO;
    Logging.stdLog(log, level);
  }

  static set app(app) {
    _app = app;
  }
  static get app() {
    return _app;
  }
  static get Constants() {
    return Constants;
  }
  static get LogLevel() {
    return Logging.Constants.LogLevel;
  }
}

module.exports = Route;
