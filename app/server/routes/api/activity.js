'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file activity.js
 * @description Activity API specification
 * @module API
 * @author Chris Bates-Keegan
 *
 */

const Route = require('../route');
const Model = require('../../model');
const Helpers = require('../../helpers');
const Logging = require('../../logging');

const routes = [];

/**
 * @class GetActivityList
 */
class GetActivityList extends Route {
  constructor() {
    super('activity', 'GET ACTIVITY LIST');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.USER;
    this.permissions = Route.Constants.Permissions.LIST;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Activity.findAll(this._timer)
      .then(Logging.Promise.logTimer(`LOADED: ${this.name}`, this._timer, Logging.Constants.LogLevel.INFO))
      .then(Helpers.Promise.arrayProp('details'));
  }
}
routes.push(GetActivityList);

/**
 * @class GetActivity
 */
class GetActivity extends Route {
  constructor() {
    super('activity/:id', 'GET ACTIVITY');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.USER;
    this.permissions = Route.Constants.Permissions.READ;

    this._activity = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.params.id) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }
      Model.Activity.findById(this.req.params.id).then(activity => {
        if (!activity) {
          this.log('ERROR: Invalid Activity ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        this._activity = activity;
        resolve(true);
      });
    });
  }

  _exec() {
    return Promise.resolve(this._activity.details);
  }
}
routes.push(GetActivity);

/**
 * @class DeleteAllActivity
 */
class DeleteAllActivity extends Route {
  constructor() {
    super('activity', 'DELETE ALL ACTIVITY');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.DELETE;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Activity.rmAll().then(() => true);
  }
}
routes.push(DeleteAllActivity);

/**
 * @class AddActivityMetadata
 */
class AddActivityMetadata extends Route {
  constructor() {
    super('activity/:id/metadata/:key', 'ADD ACTIVITY METADATA');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._activity = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Activity.findById(this.req.params.id).then(activity => {
        if (!activity) {
          this.log('ERROR: Invalid Activity ID', Route.LogLevel.ERR);
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

        this._activity = activity;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._activity.addOrUpdateMetadata(this.req.params.key, this.req.body.value);
  }
}
routes.push(AddActivityMetadata);

/**
 * @class UpdateActivityMetadata
 */
class UpdateActivityMetadata extends Route {
  constructor() {
    super('activity/:id/metadata/:key', 'UPDATE ACTIVITY METADATA');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._activity = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Activity.findById(this.req.params.id).then(activity => {
        if (!activity) {
          this.log('ERROR: Invalid Activity ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (activity.findMetadata(this.req.params.key) === false) {
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

        this._activity = activity;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._activity.addOrUpdateMetadata(this.req.params.key, this.req.body.value);
  }
}
routes.push(UpdateActivityMetadata);

/**
 * @class GetActivityMetadata
 */
class GetActivityMetadata extends Route {
  constructor() {
    super('activity/:id/metadata/:key', 'GET ACTIVITY METADATA');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.GET;

    this._metadata = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Activity.findById(this.req.params.id).then(activity => {
        if (!activity) {
          this.log('ERROR: Invalid Activity ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }

        this._metadata = activity.findMetadata(this.req.params.key);
        if (this._metadata === false) {
          this.log('WARN: Activity Metadata Not Found', Route.LogLevel.ERR);
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
routes.push(GetActivityMetadata);

/**
 * @class DeleteActivityMetadata
 */
class DeleteActivityMetadata extends Route {
  constructor() {
    super('activity/:id/metadata/:key', 'DELETE ACTIVITY METADATA');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._activity = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Activity
        .findById(this.req.params.id).select('id')
        .then(activity => {
          if (!activity) {
            this.log('ERROR: Invalid Activity ID', Route.LogLevel.ERR);
            reject({statusCode: 400, message: `Invalid Activity ID: ${this.req.params.id}`});
            return;
          }
          this._activity = activity;
          resolve(true);
        }, err => reject({statusCode: 400, message: err.message}));
    });
  }

  _exec() {
    return this._activity.rmMetadata(this.req.params.key);
  }
}
routes.push(DeleteActivityMetadata);

/**
 * @type {*[]}
 */
module.exports = routes;
