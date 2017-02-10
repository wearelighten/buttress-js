'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file call.js
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
 * @class GetCallList
 */
class GetCallList extends Route {
  constructor() {
    super('call', 'GET CALL LIST');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.LIST;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Call.getAll()
      .then(Helpers.Promise.arrayProp('details'));
  }
}
routes.push(GetCallList);

/**
 * @class GetCall
 */
class GetCall extends Route {
  constructor() {
    super('call/:id', 'GET CALL');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.READ;

    this._call = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Call.findById(this.req.params.id)
        .then(call => {
          if (!call) {
            this.log('ERROR: Invalid Call ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._call = call;
          resolve(true);
        });
    });
  }

  _exec() {
    return Promise.resolve(this._call.details);
  }
}
routes.push(GetCall);

/**
 * @class AddCall
 */
class AddCall extends Route {
  constructor() {
    super('call', 'ADD CALL');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = Model.Call.validate(this.req.body);
      if (!validation.isValid) {
        this.log(`ERROR: Missing required fields: ${validation.missing}`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `Missing required fields: ${validation.missing}`});
        return;
      }

      resolve(true);
    });
  }

  _exec() {
    return Model.Call.add(this.req.body)
      .then(arr => arr[0])
      .then(Helpers.Promise.prop('details'));
  }
}
routes.push(AddCall);

/**
 * @class UpdateCall
 */
class UpdateCall extends Route {
  constructor() {
    super('call/:id', 'UPDATE CALL');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.WRITE;
    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;

    this._call = null;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = Model.Call.validateUpdate(this.req.body);
      if (!validation.isValid) {
        if (validation.isPathValid === false) {
          this.log(`ERROR: Update path is invalid: ${validation.invalidPath}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `CALL: Update path is invalid: ${validation.invalidPath}`});
          return;
        }
        if (validation.isValueValid === false) {
          this.log(`ERROR: Update value is invalid: ${validation.invalidValue}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `CALL: Update value is invalid: ${validation.invalidValue}`});
          return;
        }
      }

      Model.Call.findById(this.req.params.id)
      .then(call => {
        if (!call) {
          this.log('ERROR: Invalid Call ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        this._call = call;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._call.updateByPath(this.req.body);
  }
}
routes.push(UpdateCall);

/**
 * @class DeleteCall
 */
class DeleteCall extends Route {
  constructor() {
    super('call/:id', 'DELETE CALL');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._call = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Call.findById(this.req.params.id)
        .then(call => {
          if (!call) {
            this.log('ERROR: Invalid Call ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._call = call;
          resolve(true);
        });
    });
  }

  _exec() {
    return this._call.rm().then(() => true);
  }
}
routes.push(DeleteCall);

/**
 * @class DeleteAllCalls
 */
class DeleteAllCalls extends Route {
  constructor() {
    super('call', 'DELETE ALL CALLS');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.DELETE;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Call.rmAll().then(() => true);
  }
}
routes.push(DeleteAllCalls);

/**
 * @class AddMetadata
 */
class AddMetadata extends Route {
  constructor() {
    super('call/:id/metadata/:key', 'ADD CALL METADATA');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._call = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Call.findById(this.req.params.id).then(call => {
        if (!call) {
          this.log('ERROR: Invalid Call ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (`${call._app}` !== `${this.req.authApp._id}`) {
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

        this._call = call;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._call.addOrUpdateMetadata(this.req.params.key, this.req.body.value);
  }
}
routes.push(AddMetadata);

/**
 * @class GetMetadata
 */
class GetMetadata extends Route {
  constructor() {
    super('call/:id/metadata/:key?', 'GET CALL METADATA');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.GET;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      this._metadata = null;
      this._allMetadata = null;

      Logging.log(`AppID: ${this.req.authApp._id}`, Route.LogLevel.DEBUG);
      Model.Call.findById(this.req.params.id).then(call => {
        if (!call) {
          this.log('ERROR: Invalid Call ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (`${call._app}` !== `${this.req.authApp._id}`) {
          this.log('ERROR: Not authorised', Route.LogLevel.ERR);
          reject({statusCode: 401});
          return;
        }
        // Logging.log(this._metadata.value, Route.LogLevel.INFO);
        if (this.req.params.key) {
          this._metadata = call.findMetadata(this.req.params.key);
          if (this._metadata === false) {
            this.log('WARN: Call Metadata Not Found', Route.LogLevel.ERR);
            reject({statusCode: 404});
            return;
          }
        } else {
          this._allMetadata = call.metadata.reduce((prev, curr) => {
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
    super('call/:id/metadata/:key', 'DELETE CALL METADATA');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._call = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Call
        .findById(this.req.params.id).select('id, _app')
        .then(call => {
          if (!call) {
            this.log('ERROR: Invalid Call ID', Route.LogLevel.ERR);
            reject({statusCode: 400, message: `Invalid Call ID: ${this.req.params.id}`});
            return;
          }
          if (`${call._app}` !== `${this.req.authApp._id}`) {
            this.log('ERROR: Not authorised', Route.LogLevel.ERR);
            reject({statusCode: 401});
            return;
          }
          this._call = call;
          resolve(true);
        }, err => reject({statusCode: 400, message: err.message}));
    });
  }

  _exec() {
    return this._call.rmMetadata(this.req.params.key);
  }
}
routes.push(DeleteMetadata);

/**
 * @type {*[]}
 */
module.exports = routes;
