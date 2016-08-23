'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file app.js
 * @description App API specification
 * @module API
 * @author Chris Bates-Keegan
 *
 */

var Route = require('../route');
var Model = require('../../model');
var Logging = require('../../logging');

var routes = [];

/**
 * @class GetAppList
 */
class GetAppList extends Route {
  constructor() {
    super('app', 'GET APP LIST');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.LIST;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      resolve(true);
    });
  }

  _exec() {
    return new Promise((resolve, reject) => {
      Model.App.findAll().then(resolve, reject);
    });
  }
}
routes.push(GetAppList);

/**
 * @class GetApp
 */
class GetApp extends Route {
  constructor() {
    super('app/:id', 'GET APP');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.READ;

    this._app = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.params.id) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }
      Model.App.findById(this.req.params.id).populate('_token').then(app => {
        if (!app) {
          this.log('ERROR: Invalid App ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        this._app = app;
        resolve(true);
      });
    });
  }

  _exec() {
    return new Promise((resolve, reject) => {
      resolve(this._app.details);
    });
  }
}
routes.push(GetApp);

/**
 * @class AddApp
 */
class AddApp extends Route {
  constructor() {
    super('app', 'APP ADD');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.ADD;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.body.name || !this.req.body.type || !this.req.body.permissions || !this.req.body.authLevel) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }
      if (this.req.body.type === Model.Constants.App.Type.Browser && !this.req.body.domain) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }
      try {
        this.req.body.permissions = JSON.parse(this.req.body.permissions);
      } catch (e) {
        this.log('ERROR: Badly formed JSON in permissions', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }

      resolve(true);
    });
  }

  _exec() {
    return new Promise((resolve, reject) => {
      Model.App.add(this.req.body)
        .then(Logging.Promise.logProp('Added App', 'name', Route.LogLevel.INFO))
        .then(resolve, reject);
    });
  }
}
routes.push(AddApp);

/**
 * @class DeleteApp
 */
class DeleteApp extends Route {
  constructor() {
    super('app/:id', 'DELETE APP');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.WRITE;
    this._app = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.params.id) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }
      Model.App.findById(this.req.params.id).then(app => {
        if (!app) {
          this.log('ERROR: Invalid App ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        this._app = app;
        resolve(true);
      });
    });
  }

  _exec() {
    return new Promise((resolve, reject) => {
      Model.App.rm(this._app).then(() => true).then(resolve, reject);
    });
  }
}
routes.push(DeleteApp);

/**
 * @class SetAppOwner
 */
class SetAppOwner extends Route {
  constructor() {
    super('app/:id', 'SET APP OWNER');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.WRITE;

    this._app = false;
    this._group = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.body.groupId) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }

      Model.Group.findById(this.req.body.groupId).then(group => {
        if (!group) {
          this.log('ERROR: Invalid Group ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        this._group = group;
      }).then(
        Model.App.findById(this.req.params.id).then(app => {
          if (!app) {
            this.log('ERROR: Invalid App ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._app = app;
          resolve(true);
        })
      , reject
      );
    });
  }

  _exec() {
    return new Promise((resolve, reject) => {
      this._app.setOwner(this._group).then(() => true).then(resolve, reject);
    });
  }
}
routes.push(SetAppOwner);

/**
 * @class GetAppPermissionList
 */
class GetAppPermissionList extends Route {
  constructor() {
    super('app/:id/permission', 'GET APP PERMISSION LIST');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.LIST;

    this._app = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.params.id) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }
      Model.App.findById(this.req.params.id).then(app => {
        if (!app) {
          this.log('ERROR: Invalid App ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        this._app = app;
        resolve(true);
      });
    });
  }

  _exec() {
    return new Promise((resolve, reject) => {
      resolve(this._app.permissions.map(p => {
        return {
          route: p.route,
          permission: p.permission
        };
      }));
    });
  }
}
routes.push(GetAppPermissionList);

/**
 * @type {*[]}
 */
module.exports = routes;
