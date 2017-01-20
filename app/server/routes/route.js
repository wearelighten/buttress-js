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

const Config = require('../config');
const Logging = require('../logging');
const Model = require('../model');
const Helpers = require('../helpers');
// var OTP = require('../stotp');
const _ = require('underscore');

/**
 */
// var _otp = OTP.create({
//   length: 12,
//   mode: OTP.Constants.Mode.ALPHANUMERIC,
//   salt: Config.RHIZOME_OTP_SALT,
//   tolerance: 3
// });

var _app = null;
var _io = null;

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
    this.activityBroadcast = false;
    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityTitle = 'Private Activity';
    this.activityDescription = '';

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
        .then(Logging.Promise.log('authenticated', Logging.Constants.LogLevel.SILLY))
        .then(_.bind(this._validate, this), reject)
        .then(Logging.Promise.log('validated', Logging.Constants.LogLevel.SILLY))
        .then(_.bind(this._exec, this), reject)
        .then(Logging.Promise.log('exec\'ed', Logging.Constants.LogLevel.SILLY))
        .then(_.bind(this._logActivity, this))
        .then(resolve, reject)
        .catch(Logging.Promise.logError());
    });
  }

  _logActivity(res) {
    Logging.logDebug(`logging activity: [${this.verb}] ${this.path} (${this.auth}:${this.permissions})`);
    let broadcast = activity => {
      if (this.activityBroadcast === false) {
        return;
      }

      let userId = activity._user ? activity._user._id : null;

      _io.sockets.emit('db-activity', {
        visibility: this.activityVisibility,
        path: this.req.path.replace(Config.app.apiPrefix, ''),
        pathSpec: this.path,
        verb: this.verb,
        permissions: this.permissions,
        title: this.activityTitle,
        description: this.activityDescription,
        timestamp: activity.timestamp,
        activityId: activity._id,
        response: res,
        user: userId
      });
    };

    return Model.Activity.add(this, res)
      .then(broadcast)
      .then(Helpers.Promise.inject(res));
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

      if (!this.req.token) {
        this.log('EAUTH: INVALID TOKEN', Logging.Constants.LogLevel.ERR);
        reject({statusCode: 401});
        return;
      }

      this.log(`AUTHLEVEL: ${this.auth}`, Logging.Constants.LogLevel.VERBOSE);
      if (this.req.token.authLevel < this.auth) {
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
      let token = this.req.token;
      Logging.log(token.permissions, Logging.Constants.LogLevel.SILLY);
      for (var x = 0; x < token.permissions.length; x++) {
        var p = token.permissions[x];
        if (this._matchRoute(p.route) && this._matchPermission(p.permission)) {
          authorised = true;
          break;
        }
      }

      if (authorised === true) {
        resolve(this.req.token);
      } else {
        this.log(token.permissions, Logging.Constants.LogLevel.ERR);
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
      this.req.token.authLevel >= Constants.Auth.SUPER) {
      return true;
    }

    if (routeSpec === this.path) {
      return true;
    }

    var wildcard = /(.+)(\/\*)/;
    var matches = routeSpec.match(wildcard);
    if (matches) {
      Logging.log(matches, Logging.Constants.LogLevel.DEBUG);
      if (this.path.match(new RegExp(`^${matches[1]}`)) &&
        this.req.token.authLevel >= Constants.Auth.ADMIN) {
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
  static set io(io) {
    _io = io;
  }
  static get io() {
    return _io;
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
