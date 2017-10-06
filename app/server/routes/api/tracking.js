'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file tracking.js
 * @description Tracking API specification
 * @module API
 * @author Chris Bates-Keegan
 *
 */

const Route = require('../route');
const Model = require('../../model');

let routes = [];

/**
 * @class GetTrackingList
 */
class GetTrackingList extends Route {
  constructor() {
    super('tracking', 'GET TRACKING LIST');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.LIST;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Tracking.getAll();
  }
}
routes.push(GetTrackingList);

/**
 * @class AddTracking
 */
class AddTracking extends Route {
  constructor() {
    super('tracking', 'ADD TRACKING');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.USER;
    this.permissions = Route.Constants.Permissions.ADD;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = Model.Tracking.validate(this.req.body);
      if (!validation.isValid) {
        if (validation.missing.length > 0) {
          this.log(`ERROR: Missing field: ${validation.missing[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `TRACKING: Missing field: ${validation.missing[0]}`});
          return;
        }
        if (validation.invalid.length > 0) {
          this.log(`ERROR: Invalid value: ${validation.invalid[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `TRACKING: Invalid value: ${validation.invalid[0]}`});
          return;
        }

        this.log(`ERROR: TRACKING: Unhandled Error`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `TRACKING: Unhandled error.`});
        return;
      }

      resolve(true);
    });
  }

  _exec() {
    return Model.Tracking.add(this.req.body);
  }
}
routes.push(AddTracking);

/**
 * @class DeleteTracking
 */
class DeleteTracking extends Route {
  constructor() {
    super('tracking/:id', 'DELETE TRACKING');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._tracking = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Tracking.findById(this.req.params.id)
        .then(tracking => {
          if (!tracking) {
            this.log('ERROR: Invalid Tracking ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._tracking = tracking;
          resolve(true);
        });
    });
  }

  _exec() {
    return this._tracking.rm().then(() => true);
  }
}
routes.push(DeleteTracking);

/**
 * @class DeleteAllTrackings
 */
class DeleteAllTrackings extends Route {
  constructor() {
    super('tracking', 'DELETE ALL TRACKINGS');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.DELETE;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Tracking.rmAll().then(() => true);
  }
}
routes.push(DeleteAllTrackings);

/**
 * @type {*[]}
 */
module.exports = routes;
