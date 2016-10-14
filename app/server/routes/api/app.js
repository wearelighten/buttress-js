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
      if (this.req.body.ownerGroupId) {
        Model.Group.findById(this.req.body.ownerGroupId)
          .then(Logging.Promise.log('Group', Route.LogLevel.VERBOSE))
          .then(group => {
            if (!group) {
              Logging.log('Error: Invalid Group ID', Route.LogLevel.WARN);
              reject({statusCode: 400});
              return;
            }
            resolve(true);
          }, err => {
            Logging.log(`Error: Malformed Group ID: ${err.message}`, Route.LogLevel.ERR);
            reject({statusCode: 400});
          });
      } else {
        resolve(true);
      }
    });
  }

  _exec() {
    return new Promise((resolve, reject) => {
      Model.App.add(this.req.body)
        .then(res => {
          return Object.assign(res.app.details, {token: res.token.value});
        })
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
    super('app/:id/owner', 'SET APP OWNER');
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
      }).then(() => {
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
 * @class AddAppPermission
 */
class AddAppPermission extends Route {
  constructor() {
    super('app/:id/permission', 'ADD APP PERMISSION');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.ADD;

    this._app = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.App.findById(this.req.params.id).then(app => {
        if (!app) {
          this.log('ERROR: Invalid App ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }

        if (!this.req.body.route || !this.req.body.permission) {
          this.log('ERROR: Missing required field', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }

        this._app = app;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._app.addOrUpdatePermission(this.req.body.route, this.req.body.permission)
      .then(a => a.details);
  }
}
routes.push(AddAppPermission);

/**
 * @class AddAppMetadata
 */
class AddAppMetadata extends Route {
  constructor() {
    super('app/metadata/:key', 'ADD APP METADATA');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._app = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.App.findById(this.req.appDetails._id).then(app => {
        if (!app) {
          this.log('ERROR: Invalid App ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        try {
          JSON.parse(this.req.body.value);
        } catch (e) {
          this.log(`ERROR: ${e.message}`, Route.LogLevel.ERR);
          this.log(this.req.body.value, Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }

        this._app = app;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._app.addOrUpdateMetadata(this.req.params.key, this.req.body.value)
      .then(a => a.details);
  }
}
routes.push(AddAppMetadata);

/**
 * @class UpdateAppMetadata
 */
class UpdateAppMetadata extends Route {
  constructor() {
    super('app/metadata/:key', 'UPDATE APP METADATA');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._app = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.App.findById(this.req.appDetails._id).then(app => {
        if (!app) {
          this.log('ERROR: Invalid App ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (app.findMetadata(this.req.params.key) === false) {
          this.log('ERROR: Metadata does not exist', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        try {
          JSON.parse(this.req.body.value);
        } catch (e) {
          this.log(`ERROR: ${e.message}`, Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }

        this._app = app;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._app.addOrUpdateMetadata(this.req.params.key, this.req.body.value);
  }
}
routes.push(UpdateAppMetadata);

/**
 * @class GetAppMetadata
 */
class GetAppMetadata extends Route {
  constructor() {
    super('app/metadata/:key', 'GET APP METADATA');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.GET;

    this._metadata = null;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Logging.log(`AppID: ${this.req.appDetails._id}`, Route.LogLevel.DEBUG);
      Model.App.findById(this.req.appDetails._id).then(app => {
        if (!app) {
          this.log('ERROR: Invalid App ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        this._metadata = app.findMetadata(this.req.params.key);
        if (this._metadata === false) {
          this.log('WARN: App Metadata Not Found', Route.LogLevel.ERR);
          reject({statusCode: 404});
          return;
        }

        resolve(true);
      });
    });
  }

  _exec() {
    return this._metadata.value;
  }
}
routes.push(GetAppMetadata);

/**
 * @type {*[]}
 */
module.exports = routes;
