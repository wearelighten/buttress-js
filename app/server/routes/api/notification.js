'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file notification.js
 * @description Company API specification
 * @module API
 * @author Chris Bates-Keegan
 *
 */

const Route = require('../route');
const Model = require('../../model');
const Helpers = require('../../helpers');

let routes = [];

/**
 * @class GetNotificationList
 */
class GetNotificationList extends Route {
  constructor() {
    super('notification', 'GET NOTIFICATION LIST');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.LIST;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Notification.getAll()
      .then(Helpers.Promise.arrayProp('details'));
  }
}
routes.push(GetNotificationList);

/**
 * @class GetNotification
 */
class GetNotification extends Route {
  constructor() {
    super('notification/:id', 'GET NOTIFICATION');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.READ;

    this._notification = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Notification.findById(this.req.params.id)
        .then(notification => {
          if (!notification) {
            this.log('ERROR: Invalid Notification ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._notification = notification;
          resolve(true);
        });
    });
  }

  _exec() {
    return Promise.resolve(this._notification.details);
  }
}
routes.push(GetNotification);

/**
 * @class AddNotification
 */
class AddNotification extends Route {
  constructor() {
    super('notification', 'ADD NOTIFICATION');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = Model.Notification.validate(this.req.body);
      if (!validation.isValid) {
        this.log(`ERROR: Missing required fields: ${validation.missing}`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `NOTIFICATION: Missing required fields: ${validation.missing}`});
        return;
      }

      resolve(true);
    });
  }

  _exec() {
    return Model.Notification.add(this.req.body)
      .then(arr => arr[0])
      .then(Helpers.Promise.prop('details'));
  }
}
routes.push(AddNotification);

/**
 * @class UpdateNotification
 */
class UpdateNotification extends Route {
  constructor() {
    super('notification/:id', 'UPDATE NOTIFICATION');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.WRITE;
    this._notification = null;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = Model.Notification.validateUpdate(this.req.body);
      if (validation.isValid !== true) {
        if (validation.missingRequired) {
          this.log(`ERROR: Missing required field: ${validation.missingRequired}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `NOTIFICATION: Missing required field: ${validation.missingRequired}`});
          return;
        }
        if (validation.isPathValid !== true) {
          this.log(`ERROR: Invalid update path: ${validation.invalidPath}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `NOTIFICATION: Invalid update path: ${validation.invalidPath}`});
          return;
        }
        if (validation.isValueValid !== true) {
          this.log(`ERROR: Invalid update value: ${validation.invalidValue}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `NOTIFICATION: Invalid update value: ${validation.invalidValue}`});
          return;
        }
      }

      Model.Notification.findById(this.req.params.id)
      .then(notification => {
        if (!notification) {
          this.log('ERROR: Invalid Notification ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (!this.req.body.path) {
          this.log('ERROR: Missing required field: path', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (!this.req.body.value) {
          this.log('ERROR: Missing required field: value', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }

        this._notification = notification;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._notification.updateByPath(this.req.body);
  }
}
routes.push(UpdateNotification);

/**
 * @class DeleteNotification
 */
class DeleteNotification extends Route {
  constructor() {
    super('notification/:id', 'DELETE NOTIFICATION');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._notification = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Notification.findById(this.req.params.id)
        .then(notification => {
          if (!notification) {
            this.log('ERROR: Invalid Notification ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._notification = notification;
          resolve(true);
        });
    });
  }

  _exec() {
    return this._notification.rm().then(() => true);
  }
}
routes.push(DeleteNotification);

/**
 * @class DeleteAllNotifications
 */
class DeleteAllNotifications extends Route {
  constructor() {
    super('notification', 'DELETE ALL NOTIFICATIONS');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.DELETE;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Notification.rmAll().then(() => true);
  }
}
routes.push(DeleteAllNotifications);

/**
 * @type {*[]}
 */
module.exports = routes;
