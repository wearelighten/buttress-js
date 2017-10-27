'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file service.js
 * @description Service API specification
 * @module API
 * @author Chris Bates-Keegan
 *
 */

const Route = require('../route');
const Model = require('../../model');
const Logging = require('../../logging');

let routes = [];

/**
 * @class GetServiceList
 */
class GetServiceList extends Route {
  constructor() {
    super('service', 'GET SERVICE LIST');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.LIST;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Service.getAll();
  }
}
routes.push(GetServiceList);

/**
 * @class GetAllMetadata
 */
class GetAllMetadata extends Route {
  constructor() {
    super('service/metadata/all', 'GET ALL SERVICE METADATA');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.GET;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Service.getAllMetadata();
  }
}
routes.push(GetAllMetadata);

/**
 * @class GetService
 */
class GetService extends Route {
  constructor() {
    super('service/:id', 'GET SERVICE');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.READ;

    this._service = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Service.findById(this.req.params.id)
        .then(service => {
          if (!service) {
            this.log('ERROR: Invalid Service ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._service = service;
          resolve(true);
        });
    });
  }

  _exec() {
    return Promise.resolve(this._service.details);
  }
}
routes.push(GetService);

/**
 * @class AddService
 */
class AddService extends Route {
  constructor() {
    super('service', 'ADD SERVICE');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = Model.Service.validate(this.req.body);
      if (!validation.isValid) {
        if (validation.missing.length > 0) {
          this.log(`ERROR: Missing field: ${validation.missing[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `SERVICE: Missing field: ${validation.missing[0]}`});
          return;
        }
        if (validation.invalid.length > 0) {
          this.log(`ERROR: Invalid value: ${validation.invalid[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `SERVICE: Invalid value: ${validation.invalid[0]}`});
          return;
        }

        this.log(`ERROR: SERVICE: Unhandled Error`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `SERVICE: Unhandled error.`});
        return;
      }

      resolve(true);
    });
  }

  _exec() {
    return Model.Service.add(this.req.body);
  }
}
routes.push(AddService);

/**
 * @class BulkAddServices
 */
class BulkAddServices extends Route {
  constructor() {
    super('service/bulk/add', 'BULK ADD SERVICES');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      // Logging.logDebug(JSON.stringify(this.req.body.services));
      if (this.req.body.services instanceof Array === false) {
        this.log(`ERROR: You need to supply an array of services`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `Invalid data: send an array`});
        return;
      }
      // if (this.req.body.services.length > 301) {
      //   this.log(`ERROR: No more than 300`, Route.LogLevel.ERR);
      //   reject({statusCode: 400, message: `Invalid data: send no more than 300 services at a time`});
      //   return;
      // }

      let validation = Model.Service.validate(this.req.body.services);
      if (!validation.isValid) {
        if (validation.missing.length > 0) {
          this.log(`ERROR: Missing field: ${validation.missing[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `SERVICE: Missing field: ${validation.missing[0]}`});
          return;
        }
        if (validation.invalid.length > 0) {
          this.log(`ERROR: Invalid value: ${validation.invalid[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `SERVICE: Invalid value: ${validation.invalid[0]}`});
          return;
        }

        this.log(`ERROR: SERVICE: Unhandled Error`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `SERVICE: Unhandled error.`});
        return;
      }
      resolve(true);
    });
  }

  _exec() {
    return Model.Service.add(this.req.body.services);
  }
}
routes.push(BulkAddServices);

/**
 * @class UpdateService
 */
class UpdateService extends Route {
  constructor() {
    super('service/:id', 'UPDATE SERVICE');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.WRITE;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = Model.Service.validateUpdate(this.req.body);
      if (!validation.isValid) {
        if (validation.isPathValid === false) {
          this.log(`ERROR: Update path is invalid: ${validation.invalidPath}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `SERVICE: Update path is invalid: ${validation.invalidPath}`});
          return;
        }
        if (validation.isValueValid === false) {
          this.log(`ERROR: Update value is invalid: ${validation.invalidValue}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `SERVICE: Update value is invalid: ${validation.invalidValue}`});
          return;
        }
      }

      Model.Service.exists(this.req.params.id)
      .then(exists => {
        if (!exists) {
          this.log('ERROR: Invalid Service ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        resolve(true);
      });
    });
  }

  _exec() {
    return Model.Service.updateByPath(this.req.body, this.req.params.id);
  }
}
routes.push(UpdateService);

/**
 * @class DeleteService
 */
class DeleteService extends Route {
  constructor() {
    super('service/:id', 'DELETE SERVICE');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._service = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Service.findById(this.req.params.id)
        .then(service => {
          if (!service) {
            this.log('ERROR: Invalid Service ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._service = service;
          resolve(true);
        });
    });
  }

  _exec() {
    return this._service.rm().then(() => true);
  }
}
routes.push(DeleteService);

/**
 * @class BulkDeleteServices
 */
class BulkDeleteServices extends Route {
  constructor() {
    super('service/bulk/delete', 'BULK DELETE SERVICES');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._ids = [];
  }

  _validate() {
    return new Promise((resolve, reject) => {
      this._ids = this.req.body;
      if (!this._ids) {
        this.log('ERROR: No service IDs provided', Route.LogLevel.ERR);
        reject({statusCode: 400, message: 'ERROR: No service IDs provided'});
        return;
      }
      if (!this._ids.length) {
        this.log('ERROR: No service IDs provided', Route.LogLevel.ERR);
        reject({statusCode: 400, message: 'ERROR: No service IDs provided'});
        return;
      }
      if (this._ids.length > 300) {
        this.log('ERROR: No more than 300 service IDs are supported', Route.LogLevel.ERR);
        reject({statusCode: 400, message: 'ERROR: No more than 300 service IDs are supported'});
        return;
      }
      resolve(true);
    });
  }

  _exec() {
    return Model.Service.rmBulk(this._ids).then(() => true);
  }
}
routes.push(BulkDeleteServices);

/**
 * @class DeleteAllServices
 */
class DeleteAllServices extends Route {
  constructor() {
    super('service', 'DELETE ALL SERVICES');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.DELETE;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Service.rmAll().then(() => true);
  }
}
routes.push(DeleteAllServices);

/**
 * @class AddMetadata
 */
class AddMetadata extends Route {
  constructor() {
    super('service/:id/metadata/:key', 'ADD SERVICE METADATA');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._service = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Service.findById(this.req.params.id).then(service => {
        if (!service) {
          this.log('ERROR: Invalid Service ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (`${service._app}` !== `${this.req.authApp._id}`) {
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

        this._service = service;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._service.addOrUpdateMetadata(this.req.params.key, this.req.body.value);
  }
}
routes.push(AddMetadata);

/**
 * @class GetMetadata
 */
class GetMetadata extends Route {
  constructor() {
    super('service/:id/metadata/:key?', 'GET SERVICE METADATA');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.GET;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      this._metadata = null;
      this._allMetadata = null;

      Logging.log(`AppID: ${this.req.authApp._id}`, Route.LogLevel.DEBUG);
      Model.Service.findById(this.req.params.id).then(service => {
        if (!service) {
          this.log('ERROR: Invalid Service ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (`${service._app}` !== `${this.req.authApp._id}`) {
          this.log('ERROR: Not authorised', Route.LogLevel.ERR);
          reject({statusCode: 401});
          return;
        }
        // Logging.log(this._metadata.value, Route.LogLevel.INFO);
        if (this.req.params.key) {
          this._metadata = service.findMetadata(this.req.params.key);
          if (this._metadata === false) {
            this.log('WARN: Service Metadata Not Found', Route.LogLevel.ERR);
            reject({statusCode: 404});
            return;
          }
        } else {
          this._allMetadata = service.metadata.reduce((prev, curr) => {
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
    super('service/:id/metadata/:key', 'DELETE SERVICE METADATA');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._service = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Service
        .findById(this.req.params.id).select('id, _app')
        .then(service => {
          if (!service) {
            this.log('ERROR: Invalid Service ID', Route.LogLevel.ERR);
            reject({statusCode: 400, message: `Invalid Service ID: ${this.req.params.id}`});
            return;
          }
          if (`${service._app}` !== `${this.req.authApp._id}`) {
            this.log('ERROR: Not authorised', Route.LogLevel.ERR);
            reject({statusCode: 401});
            return;
          }
          this._service = service;
          resolve(true);
        }, err => reject({statusCode: 400, message: err.message}));
    });
  }

  _exec() {
    return this._service.rmMetadata(this.req.params.key);
  }
}
routes.push(DeleteMetadata);

/**
 * @type {*[]}
 */
module.exports = routes;
