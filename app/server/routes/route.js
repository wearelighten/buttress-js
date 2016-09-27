'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file route.js
 * @description Route Class - Route authorisation (against app permissions), validation and execution
 * @module System
 * @author Chris Bates-Keegan
 *
 */

// var Config = require('../config');
var Logging = require('../logging');
// var OTP = require('../stotp');
var _ = require('underscore');

/**
 */
// var _otp = OTP.create({
//   length: 12,
//   mode: OTP.Constants.Mode.ALPHANUMERIC,
//   salt: Config.RHIZOME_OTP_SALT,
//   tolerance: 3
// });

var _app = null;

/**
 * @type {{Auth: {
 *          NONE: number,
 *          USER: number,
 *          ADMIN: number,
 *          SUPER: number},
 *         Permissions: {
 *          NONE: string,
 *          ADD: string,
 *          READ: string,
 *          WRITE: string,
 *          LIST: string,
 *          DELETE: string,
 *          ALL: string
*          },
 *         Verbs: {
 *          GET: string,
 *          POST: string,
 *          PUT: string,
 *          DEL: string
*          }}}
 */
var Constants = {
  Auth: {
    NONE: 0,
    USER: 1,
    ADMIN: 2,
    SUPER: 3
  },
  Permissions: {
    NONE: '',
    ADD: 'add',
    READ: 'read',
    WRITE: 'write',
    LIST: 'list',
    DELETE: 'delete',
    ALL: '*'
  },
  Verbs: {
    GET: 'get',
    POST: 'post',
    PUT: 'put',
    DEL: 'delete'
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

      this.log(`STARTING: ${this.name}`, Logging.Constants.LogLevel.INFO);
      this._authenticate()
        .then(Logging.log('authenticated', Logging.Constants.LogLevel.SILLY))
        .then(_.bind(this._validate, this), reject)
        .then(Logging.log('validated', Logging.Constants.LogLevel.SILLY))
        .then(_.bind(this._exec, this), reject)
        .then(Logging.log('exec\'ed', Logging.Constants.LogLevel.SILLY))
        .then(_.bind(this._logAppUsage, this))
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

      if (!this.req.appDetails) {
        this.log('EAUTH: INVALID TOKEN', Logging.Constants.LogLevel.ERR);
        reject({statusCode: 401});
        return;
      }

      this.log(`AUTHLEVEL: ${this.auth}`, Logging.Constants.LogLevel.VERBOSE);
      if (this.req.appDetails.authLevel < this.auth) {
        this.log('EAUTH: INSUFFICIENT AUTHORITY', Logging.Constants.LogLevel.ERR);
        reject({statusCode: 401});
        return;
      }

      /**
       * @description Route:
       *                  '*' - all routes (SUPER)
       *                  'route' - specific route (ALL)
       *                  'route/subroute' - specific route (ALL)
       *                  'route/*' name plus all children (ADMIN)
       * @TODO Improve the pattern matching granularity ie like Glob
       * @TODO Support Regex in specific ie match routes like app/:id/permission
       */
      var authorised = false;
      Logging.log(this.req.appDetails.details.permissions, Logging.Constants.LogLevel.DEBUG);
      for (var x = 0; x < this.req.appDetails.permissions.length; x++) {
        var p = this.req.appDetails.details.permissions[x];
        if (this._matchRoute(p.route) && this._matchPermission(p.permission)) {
          authorised = true;
          break;
        }
      }

      if (authorised === true) {
        resolve(this.req.appDetails);
      } else {
        this.log(`EAUTH: NO PERMISSION FOR ROUTE - ${this.path}`, Logging.Constants.LogLevel.ERR);
        reject({statusCode: 401});
      }
    });
  }

  /**
   * @param {string} routeSpec - See above for accepted route specs
   * @return {boolean} - true if the route is authorised
   * @private
   */
  _matchRoute(routeSpec) {
    if (routeSpec === '*' &&
      this.req.appDetails.authLevel >= Constants.Auth.SUPER) {
      return true;
    }

    if (routeSpec === this.path) {
      return true;
    }

    var wildcard = /(.+)(\/\*)$/;
    var matches = routeSpec.match(wildcard);
    if (matches) {
      Logging.log(matches, Logging.Constants.LogLevel.DEBUG);
      if (this.path.match(new RegExp(`^${matches[1]}`)) &&
        this.req.appDetails.authLevel >= Constants.Auth.ADMIN) {
        return true;
      }
    }

    return false;
  }

  /**
   * @param {string} permissionSpec -
   * @return {boolean} - true if authorised
   * @private
   */
  _matchPermission(permissionSpec) {
    if (permissionSpec === '*' || permissionSpec === this.permission) {
      return true;
    }

    return false;
  }

  /**
   * @param {*} res - whatever results are being returned by the API, just passed through
   * @return {Promise} - passes through the previous results when DB save completes
   * @private
   */
  _logAppUsage(res) {
    return new Promise((resolve, reject) => {
      this.req.appDetails._token.uses.push(new Date());
      this.req.appDetails._token.save().then(() => resolve(res), reject);
    });
  }

  /**
   * @param {string} log - log text
   * @param {enum} level - NONE, ERR, WARN, INFO
   */
  log(log, level) {
    level = level || Logging.Constants.LogLevel.INFO;
    Logging.log(log, level);
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

  /**
   * @return {Enum} - returns the LogLevel enum (convenience)
   */
  static get LogLevel() {
    return Logging.Constants.LogLevel;
  }
}

module.exports = Route;
