'use strict';

/**
 * ButtressJS - Realtime datastore for business software
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
const _ = require('underscore');
const Mongo = require('mongodb');
const NRP = require('node-redis-pubsub');

const nrp = new NRP(Config.redis);

/**
 */
// var _otp = OTP.create({
//   length: 12,
//   mode: OTP.Constants.Mode.ALPHANUMERIC,
//   salt: Config.RHIZOME_OTP_SALT,
//   tolerance: 3
// });

let _app = null;
let _io = null;

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
const Constants = {
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

    this._timer = this.req.timer;

    return new Promise((resolve, reject) => {
      if (!this._exec) {
        this.log(`Error: ${this.name}: No _exec defined`, Logging.Constants.LogLevel.ERR);
        reject({statusCode: 500});
        return;
      }

      this._authenticate()
        .then(Logging.Promise.logTimer(`AUTHENTICATED: ${this.name}`, this._timer, Logging.Constants.LogLevel.SILLY))
        .then(Logging.Promise.logSilly('authenticated'))
        .then(_.bind(this._validate, this), reject)
        .then(Logging.Promise.logTimer(`VALIDATED: ${this.name}`, this._timer, Logging.Constants.LogLevel.SILLY))
        .then(Logging.Promise.logSilly('validated'))
        .then(_.bind(this._exec, this), reject)
        .then(Logging.Promise.logTimer(`EXECUTED: ${this.name}`, this._timer, Logging.Constants.LogLevel.SILLY))
        .then(_.bind(this._logActivity, this))
        .then(resolve, reject)
        .catch(Logging.Promise.logError());
    });
  }

  _logActivity(res) {
    Logging.logSilly(`logging activity: [${this.verb}] ${this.path} (${this.auth}:${this.permissions})`);
    if (res instanceof Mongo.Cursor || this.verb === Constants.Verbs.GET) {
      return Promise.resolve(res);
    }

    let broadcast = () => {
      if (res) {
        const appPId = Model.App.genPublicUID(this.req.authApp.name, this.req.authAppToken.value);
        this._activityBroadcastSocket({
          title: this.activityTitle,
          description: this.activityDescription,
          visibility: this.activityVisibility,
          broadcast: this.activityBroadcast,
          path: this.req.path,
          pathSpec: this.path,
          verb: this.verb,
          permissions: this.permissions
        }, res, appPId);
      }
    };

    setTimeout(() => {
      const body = this.req.body;
      const path = this.path;
      const verb = this.verb;

      // Craft activity object and add
      Model.Activity.add({
        activityTitle: this.activityTitle,
        activityDescription: this.activityDescription,
        activityVisibility: this.activityVisibility,
        path: path,
        verb: verb,
        permissions: this.permissions,
        auth: this.auth,
        params: this.req.params,
        req: {
          query: this.req.query,
          body: body,
          params: this.req.params
        },
        res: {}
      })
      .then(activity => {
        // Activity doesn't get added via the API so we will just broadcast the data manually
        this._activityBroadcastSocket({
          title: 'Private Activity',
          description: 'ADD ACTIVITY',
          visibility: 'private',
          broadcast: false,
          path: `activity`,
          pathSpec: 'activity',
          verb: "post",
          permissions: "write"
        }, activity);
      })
      .catch(e => {
        console.log(`[${verb.toUpperCase()}] ${path}`);
        console.log(body);
        console.log(e);
      });
      broadcast();
    }, 50);

    return Promise.resolve(res);
  }

  _activityBroadcastSocket(activity, res, appPid) {
    nrp.emit('activity', {
      title: activity.title,
      description: activity.description,
      visibility: activity.visibility,
      broadcast: activity.broadcast,
      path: activity.path.replace(Config.app.apiPrefix, ''),
      pathSpec: activity.pathSpec,
      verb: activity.verb,
      permissions: activity.permissions,
      timestamp: new Date(),
      response: res,
      user: Model.authUser ? Model.authUser._id : '',
      appPId: appPid ? appPid : ''
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

      if (!this.req.token) {
        this.log('EAUTH: INVALID TOKEN', Logging.Constants.LogLevel.ERR);
        reject({statusCode: 401});
        return;
      }
      this.log(this.req.token.value, Logging.Constants.LogLevel.SILLY);

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
      let authorised = false;
      let token = this.req.token;
      Logging.logSilly(token.permissions);
      for (let x = 0; x < token.permissions.length; x++) {
        let p = token.permissions[x];
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

    let userWildcard = /^user\/me.+/;
    if (routeSpec.match(userWildcard) && this.req.params.id == this.req.authUser._id) { // eslint-disable-line eqeqeq
      Logging.logSilly(`Matched user ${this.req.authUser._id} to /user/${this.req.params.id}`);
      return true;
    }

    let wildcard = /(.+)(\/\*)/;
    let matches = routeSpec.match(wildcard);
    if (matches) {
      Logging.logSilly(matches);
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
    if (permissionSpec === '*' || permissionSpec === this.permissions) {
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
   * @return {enum} - returns the LogLevel enum (convenience)
   */
  static get LogLevel() {
    return Logging.Constants.LogLevel;
  }
}

module.exports = Route;
