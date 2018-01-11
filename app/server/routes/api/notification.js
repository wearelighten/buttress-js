'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file notification.js
 * @description Company API specification
 * @module API
 * @author Chris Bates-Keegan
 *
 */

const Route = require('../route');
const Model = require('../../model');

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
    return Model.Notification.getAll();
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
        if (validation.missing.length > 0) {
          this.log(`ERROR: Missing field: ${validation.missing[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `NOTIFICATION: Missing field: ${validation.missing[0]}`});
          return;
        }
        if (validation.invalid.length > 0) {
          this.log(`ERROR: Invalid value: ${validation.invalid[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `NOTIFICATION: Invalid value: ${validation.invalid[0]}`});
          return;
        }

        this.log(`ERROR: NOTIFICATION: Unhandled Error`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `NOTIFICATION: Unhandled error.`});
        return;
      }

      resolve(true);
    });
  }

  _exec() {
    return Model.Notification.add(this.req.body);
  }
}
routes.push(AddNotification);

/**
 * @class BulkAddNotifications
 */
class BulkAddNotifications extends Route {
  constructor() {
    super('notification/bulk/add', 'BULK ADD NOTIFICATIONS');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      // Logging.logDebug(JSON.stringify(this.req.body.contracts));
      if (this.req.body.notifications instanceof Array === false) {
        this.log(`ERROR: You need to supply an array of notifications`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `Invalid data: send an array of notifications`});
        return;
      }

      let validation = Model.Notification.validate(this.req.body.notifications);
      if (!validation.isValid) {
        if (validation.missing.length > 0) {
          this.log(`ERROR: Missing field: ${validation.missing[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `NOTIFICATION: Missing field: ${validation.missing[0]}`});
          return;
        }
        if (validation.invalid.length > 0) {
          this.log(`ERROR: Invalid value: ${validation.invalid[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `NOTIFICATION: Invalid value: ${validation.invalid[0]}`});
          return;
        }

        this.log(`ERROR: NOTIFICATION: Unhandled Error`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `NOTIFICATION: Unhandled error.`});
        return;
      }

      resolve(true);
    });
  }

  _exec() {
    return Model.Notification.add(this.req.body.notifications);
  }
}
routes.push(BulkAddNotifications);

/**
 * @class UpdateNotification
 */
class UpdateNotification extends Route {
  constructor() {
    super('notification/:id', 'UPDATE NOTIFICATION');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.WRITE;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = false;
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

      Model.Notification.exists(this.req.params.id)
      .then(notification => {
        if (!notification) {
          this.log('ERROR: Invalid Notification ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }

        resolve(true);
      });
    });
  }

  _exec() {
    return Model.Notification.updateByPath(this.req.body, this.req.params.id);
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
