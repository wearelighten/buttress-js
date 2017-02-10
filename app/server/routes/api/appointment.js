'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file appointment.js
 * @description Company API specification
 * @module API
 * @author Chris Bates-Keegan
 *
 */

const Route = require('../route');
const Model = require('../../model');
const Helpers = require('../../helpers');
const Logging = require('../../logging');

let routes = [];

/**
 * @class GetAppointmentList
 */
class GetAppointmentList extends Route {
  constructor() {
    super('appointment', 'GET APPOINTMENT LIST');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.LIST;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Appointment.getAll()
      .then(Helpers.Promise.arrayProp('details'));
  }
}
routes.push(GetAppointmentList);

/**
 * @class GetAppointment
 */
class GetAppointment extends Route {
  constructor() {
    super('appointment/:id', 'GET APPOINTMENT');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.READ;

    this._appointment = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Appointment.findById(this.req.params.id)
        .then(appointment => {
          if (!appointment) {
            this.log('ERROR: Invalid Appointment ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._appointment = appointment;
          resolve(true);
        });
    });
  }

  _exec() {
    return Promise.resolve(this._appointment.details);
  }
}
routes.push(GetAppointment);

/**
 * @class AddAppointment
 */
class AddAppointment extends Route {
  constructor() {
    super('appointment', 'ADD APPOINTMENT');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = Model.Appointment.validate(this.req.body);
      if (!validation.isValid) {
        this.log(`ERROR: Missing required fields: ${validation.missing}`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `Missing required fields: ${validation.missing}`});
        return;
      }

      resolve(true);
    });
  }

  _exec() {
    return Model.Appointment.add(this.req.body)
      .then(arr => arr[0])
      .then(Helpers.Promise.prop('details'));
  }
}
routes.push(AddAppointment);

/**
 * @class UpdateAppointment
 */
class UpdateAppointment extends Route {
  constructor() {
    super('appointment/:id', 'UPDATE APPOINTMENT');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.WRITE;
    this._appointment = null;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = Model.Appointment.validateUpdate(this.req.body);
      if (!validation.isValid) {
        if (validation.isPathValid === false) {
          this.log(`ERROR: Update path is invalid: ${validation.invalidPath}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `APPOINTMENT: Update path is invalid: ${validation.invalidPath}`});
          return;
        }
        if (validation.isValueValid === false) {
          this.log(`ERROR: Update value is invalid: ${validation.invalidValue}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `APPOINTMENT: Update value is invalid: ${validation.invalidValue}`});
          return;
        }
      }

      Model.Appointment.findById(this.req.params.id)
      .then(appointment => {
        if (!appointment) {
          this.log('ERROR: Invalid Appointment ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        this._appointment = appointment;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._appointment.updateByPath(this.req.body);
  }
}
routes.push(UpdateAppointment);

/**
 * @class DeleteAppointment
 */
class DeleteAppointment extends Route {
  constructor() {
    super('appointment/:id', 'DELETE APPOINTMENT');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._appointment = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Appointment.findById(this.req.params.id)
        .then(appointment => {
          if (!appointment) {
            this.log('ERROR: Invalid Appointment ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._appointment = appointment;
          resolve(true);
        });
    });
  }

  _exec() {
    return this._appointment.rm().then(() => true);
  }
}
routes.push(DeleteAppointment);

/**
 * @class DeleteAllAppointments
 */
class DeleteAllAppointments extends Route {
  constructor() {
    super('appointment', 'DELETE ALL APPOINTMENTS');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.DELETE;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Appointment.rmAll().then(() => true);
  }
}
routes.push(DeleteAllAppointments);

/**
 * @class AddMetadata
 */
class AddMetadata extends Route {
  constructor() {
    super('appointment/:id/metadata/:key', 'ADD APPOINTMENT METADATA');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._appointment = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Appointment.findById(this.req.params.id).then(appointment => {
        if (!appointment) {
          this.log('ERROR: Invalid Appointment ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (`${appointment._app}` !== `${this.req.authApp._id}`) {
          this.log('ERROR: Not authorised', Route.LogLevel.ERR);
          reject({statusCode: 401});
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

        this._appointment = appointment;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._appointment.addOrUpdateMetadata(this.req.params.key, this.req.body.value);
  }
}
routes.push(AddMetadata);

/**
 * @class GetMetadata
 */
class GetMetadata extends Route {
  constructor() {
    super('appointment/:id/metadata/:key?', 'GET APPOINTMENT METADATA');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.GET;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      this._metadata = null;
      this._allMetadata = null;

      Logging.log(`AppID: ${this.req.authApp._id}`, Route.LogLevel.DEBUG);
      Model.Appointment.findById(this.req.params.id).then(appointment => {
        if (!appointment) {
          this.log('ERROR: Invalid Appointment ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (`${appointment._app}` !== `${this.req.authApp._id}`) {
          this.log('ERROR: Not authorised', Route.LogLevel.ERR);
          reject({statusCode: 401});
          return;
        }
        // Logging.log(this._metadata.value, Route.LogLevel.INFO);
        if (this.req.params.key) {
          this._metadata = appointment.findMetadata(this.req.params.key);
          if (this._metadata === false) {
            this.log('WARN: Appointment Metadata Not Found', Route.LogLevel.ERR);
            reject({statusCode: 404});
            return;
          }
        } else {
          this._allMetadata = appointment.metadata.reduce((prev, curr) => {
            prev[curr.key] = JSON.parse(curr.value);
            return prev;
          }, {});
        }

        resolve(true);
      });
    });
  }

  _exec() {
    return this._metadata ? this._metadata.value : this._allMetadata;
  }
}
routes.push(GetMetadata);

/**
 * @class DeleteMetadata
 */
class DeleteMetadata extends Route {
  constructor() {
    super('appointment/:id/metadata/:key', 'DELETE APPOINTMENT METADATA');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._appointment = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Appointment
        .findById(this.req.params.id).select('id, _app')
        .then(appointment => {
          if (!appointment) {
            this.log('ERROR: Invalid Appointment ID', Route.LogLevel.ERR);
            reject({statusCode: 400, message: `Invalid Appointment ID: ${this.req.params.id}`});
            return;
          }
          if (`${appointment._app}` !== `${this.req.authApp._id}`) {
            this.log('ERROR: Not authorised', Route.LogLevel.ERR);
            reject({statusCode: 401});
            return;
          }
          this._appointment = appointment;
          resolve(true);
        }, err => reject({statusCode: 400, message: err.message}));
    });
  }

  _exec() {
    return this._appointment.rmMetadata(this.req.params.key);
  }
}
routes.push(DeleteMetadata);

/**
 * @type {*[]}
 */
module.exports = routes;
