'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file contract.js
 * @description Company API specification
 * @module API
 * @author Chris Bates-Keegan
 *
 */

const Route = require('../route');
const Model = require('../../model');
const Logging = require('../../logging');

let routes = [];

/**
 * @class GetContractList
 */
class GetContractList extends Route {
  constructor() {
    super('contract', 'GET CONTRACT LIST');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.LIST;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Contract.getAll();
      // .then(Helpers.Promise.arrayProp('details'));
  }
}
routes.push(GetContractList);

/**
 * @class GetAllMetadata
 */
class GetAllMetadata extends Route {
  constructor() {
    super('contract/metadata/all', 'GET ALL CONTRACT METADATA');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.GET;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Contract.getAllMetadata();
  }
}
routes.push(GetAllMetadata);

/**
 * @class GetContract
 */
class GetContract extends Route {
  constructor() {
    super('contract/:id', 'GET CONTRACT');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.READ;

    this._contract = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Contract.findById(this.req.params.id)
        .then(contract => {
          if (!contract) {
            this.log('ERROR: Invalid Contract ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._contract = contract;
          resolve(true);
        });
    });
  }

  _exec() {
    return Promise.resolve(this._contract.details);
  }
}
routes.push(GetContract);

/**
 * @class AddContract
 */
class AddContract extends Route {
  constructor() {
    super('contract', 'ADD CONTRACT');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = Model.Contract.validate(this.req.body);
      if (!validation.isValid) {
        if (validation.missing.length > 0) {
          this.log(`ERROR: Missing field: ${validation.missing[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `CONTRACT: Missing field: ${validation.missing[0]}`});
          return;
        }
        if (validation.invalid.length > 0) {
          this.log(`ERROR: Invalid value: ${validation.invalid[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `CONTRACT: Invalid value: ${validation.invalid[0]}`});
          return;
        }

        this.log(`ERROR: CONTRACT: Unhandled Error`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `CONTRACT: Unhandled error.`});
        return;
      }

      resolve(true);
    });
  }

  _exec() {
    return Model.Contract.add(this.req.body)
    .then(contractIds => Model.Contract.findById(contractIds[0]))
    .then(contract => contract.details);
  }
}
routes.push(AddContract);

/**
 * @class BulkAddContracts
 */
class BulkAddContracts extends Route {
  constructor() {
    super('contract/bulk/add', 'BULK ADD CONTRACTS');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      // Logging.logDebug(JSON.stringify(this.req.body.contracts));
      if (this.req.body.contracts instanceof Array === false) {
        this.log(`ERROR: You need to supply an array of contracts`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `Invalid data: send an array of contracts`});
        return;
      }
      // if (this.req.body.contracts.length > 301) {
      //   this.log(`ERROR: No more than 300 contracts`, Route.LogLevel.ERR);
      //   reject({statusCode: 400, message: `Invalid data: send no more than 300 contracts at a time`});
      //   return;
      // }

      let validation = Model.Contract.validate(this.req.body.contracts);
      if (!validation.isValid) {
        if (validation.missing.length > 0) {
          this.log(`ERROR: Missing field: ${validation.missing[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `CONTRACT: Missing field: ${validation.missing[0]}`});
          return;
        }
        if (validation.invalid.length > 0) {
          this.log(`ERROR: Invalid value: ${validation.invalid[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `CONTRACT: Invalid value: ${validation.invalid[0]}`});
          return;
        }

        this.log(`ERROR: CONTRACT: Unhandled Error`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `CONTRACT: Unhandled error.`});
        return;
      }

      resolve(true);
    });
  }

  _exec() {
    return Model.Contract.add(this.req.body.contracts);
  }
}
routes.push(BulkAddContracts);

/**
 * @class UpdateContract
 */
class UpdateContract extends Route {
  constructor() {
    super('contract/:id', 'UPDATE CONTRACT');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.WRITE;
    this._contract = null;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = Model.Contract.validateUpdate(this.req.body);
      if (!validation.isValid) {
        if (validation.isPathValid === false) {
          this.log(`ERROR: Update path is invalid: ${validation.invalidPath}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `CONTRACT: Update path is invalid: ${validation.invalidPath}`});
          return;
        }
        if (validation.isValueValid === false) {
          this.log(`ERROR: Update value is invalid: ${validation.invalidValue}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `CONTRACT: Update value is invalid: ${validation.invalidValue}`});
          return;
        }
      }

      Model.Contract.findById(this.req.params.id)
      .then(contract => {
        if (!contract) {
          this.log('ERROR: Invalid Contract ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        this._contract = contract;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._contract.updateByPath(this.req.body);
  }
}
routes.push(UpdateContract);

/**
 * @class DeleteContract
 */
class DeleteContract extends Route {
  constructor() {
    super('contract/:id', 'DELETE CONTRACT');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._contract = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Contract.findById(this.req.params.id)
        .then(contract => {
          if (!contract) {
            this.log('ERROR: Invalid Contract ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._contract = contract;
          resolve(true);
        });
    });
  }

  _exec() {
    return this._contract.rm().then(() => true);
  }
}
routes.push(DeleteContract);

/**
 * @class BulkDeleteContracts
 */
class BulkDeleteContracts extends Route {
  constructor() {
    super('contract/bulk/delete', 'BULK DELETE CONTRACTS');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._ids = [];
  }

  _validate() {
    return new Promise((resolve, reject) => {
      this._ids = this.req.body;
      if (!this._ids) {
        this.log('ERROR: No contract IDs provided', Route.LogLevel.ERR);
        reject({statusCode: 400, message: 'ERROR: No contract IDs provided'});
        return;
      }
      if (!this._ids.length) {
        this.log('ERROR: No contract IDs provided', Route.LogLevel.ERR);
        reject({statusCode: 400, message: 'ERROR: No contract IDs provided'});
        return;
      }
      // if (this._ids.length > 300) {
      //   this.log('ERROR: No more than 300 contract IDs are supported', Route.LogLevel.ERR);
      //   reject({statusCode: 400, message: 'ERROR: No more than 300 contract IDs are supported'});
      //   return;
      // }
      resolve(true);
    });
  }

  _exec() {
    return Model.Contract.rmBulk(this._ids).then(() => true);
  }
}
routes.push(BulkDeleteContracts);

/**
 * @class DeleteAllContracts
 */
class DeleteAllContracts extends Route {
  constructor() {
    super('contract', 'DELETE ALL CONTRACTS');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.DELETE;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Contract.rmAll().then(() => true);
  }
}
routes.push(DeleteAllContracts);

/**
 * @class AddMetadata
 */
class AddMetadata extends Route {
  constructor() {
    super('contract/:id/metadata/:key', 'ADD CONTRACT METADATA');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
    this._contract = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Contract.findById(this.req.params.id).then(contract => {
        if (!contract) {
          this.log('ERROR: Invalid Contract ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (`${contract._app}` !== `${this.req.authApp._id}`) {
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

        this._contract = contract;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._contract.addOrUpdateMetadata(this.req.params.key, this.req.body.value);
  }
}
routes.push(AddMetadata);

/**
 * @class GetMetadata
 */
class GetMetadata extends Route {
  constructor() {
    super('contract/:id/metadata/:key?', 'GET CONTRACT METADATA');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.GET;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      this._metadata = null;
      this._allMetadata = null;

      Logging.log(`AppID: ${this.req.authApp._id}`, Route.LogLevel.DEBUG);
      Model.Contract.findById(this.req.params.id).then(contract => {
        if (!contract) {
          this.log('ERROR: Invalid Contract ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (`${contract._app}` !== `${this.req.authApp._id}`) {
          this.log('ERROR: Not authorised', Route.LogLevel.ERR);
          reject({statusCode: 401});
          return;
        }
        // Logging.log(this._metadata.value, Route.LogLevel.INFO);
        if (this.req.params.key) {
          this._metadata = contract.findMetadata(this.req.params.key);
          if (this._metadata === false) {
            this.log('WARN: Contract Metadata Not Found', Route.LogLevel.ERR);
            reject({statusCode: 404});
            return;
          }
        } else {
          this._allMetadata = contract.metadata.reduce((prev, curr) => {
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
    super('contract/:id/metadata/:key', 'DELETE CONTRACT METADATA');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
    this._contract = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Contract
        .findById(this.req.params.id).select('id, _app')
        .then(contract => {
          if (!contract) {
            this.log('ERROR: Invalid Contract ID', Route.LogLevel.ERR);
            reject({statusCode: 400, message: `Invalid Contract ID: ${this.req.params.id}`});
            return;
          }
          if (`${contract._app}` !== `${this.req.authApp._id}`) {
            this.log('ERROR: Not authorised', Route.LogLevel.ERR);
            reject({statusCode: 401});
            return;
          }
          this._contract = contract;
          resolve(true);
        }, err => reject({statusCode: 400, message: err.message}));
    });
  }

  _exec() {
    return this._contract.rmMetadata(this.req.params.key);
  }
}
routes.push(DeleteMetadata);

/**
 * @type {*[]}
 */
module.exports = routes;
