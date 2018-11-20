'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file schemaRoutes.js
 * @description A list of default routes for schema
 * @module routes
 * @author Chris Bates-Keegan
 *
 */

const Route = require('./route');
const Model = require('../model');
// const Helpers = require('../../helpers');

let routes = [];

/**
 * @class GetList
 */
class GetList extends Route {
  constructor(schema) {
    super(`${schema.name}`, `GET ${schema.name} LIST`);
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.USER;
    this.permissions = Route.Constants.Permissions.LIST;

    // Fetch model
    this.model = Model[schema.collection];
    if (!this.model) {
      // Somthing went wrong!!1?
    }
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return this.model.findAll();
  }
}
routes.push(GetList);

/**
 * @class GetOne
 */
class GetOne extends Route {
  constructor(schema) {
    super(`${schema.name}/:id`, `GET ${schema.name}`);
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.USER;
    this.permissions = Route.Constants.Permissions.READ;

    this.schema = schema;
    this.model = Model[schema.collection];

    this._entity = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      this.model.findById(this.req.params.id)
        .then(entity => {
          if (!entity) {
            this.log(`${this.schema.name}: Invalid ID: ${this.req.params.id}`, Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._entity = entity;
          resolve(true);
        });
    });
  }

  _exec() {
    return Promise.resolve(this._entity);
  }
}
routes.push(GetOne);

/**
 * @class AddOne
 */
class AddOne extends Route {
  constructor(schema) {
    super(`${schema.name}`, `ADD ${schema.name}`);
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.USER;
    this.permissions = Route.Constants.Permissions.ADD;

    this.activityDescription = `ADD ${schema.name}`;
    this.activityBroadcast = true;

    this.schema = schema;
    this.model = Model[schema.collection];
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = this.model.validate(this.req.body);
      if (!validation.isValid) {
        if (validation.missing.length > 0) {
          this.log(`${this.schema.name}: Missing field: ${validation.missing[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `${this.schema.name}: Missing field: ${validation.missing[0]}`});
          return;
        }
        if (validation.invalid.length > 0) {
          this.log(`${this.schema.name}: Invalid value: ${validation.invalid[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `${this.schema.name}: Invalid value: ${validation.invalid[0]}`});
          return;
        }

        this.log(`${this.schema.name}: Unhandled Error`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `${this.schema.name}: Unhandled error.`});
        return;
      }

      this.model.isDuplicate(this.req.body)
        .then(res => {
          if (res === true) {
            this.log(`${this.schema.name}: Duplicate entity`, Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          resolve(true);
        });
    });
  }

  _exec() {
    return this.model.add(this.req.body);
  }
}
routes.push(AddOne);

/**
 * @class UpdateOne
 */
class UpdateOne extends Route {
  constructor(schema) {
    super(`${schema.name}/:id`, `UPDATE ${schema.name}`);
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.USER;
    this.permissions = Route.Constants.Permissions.WRITE;

    this.activityDescription = `ADD ${schema.name}`;
    this.activityBroadcast = true;

    this.schema = schema;
    this.model = Model[schema.collection];

    this._entity = null;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = this.model.validateUpdate(this.req.body);
      if (!validation.isValid) {
        if (validation.isPathValid === false) {
          this.log(`${this.schema.name}: Update path is invalid: ${validation.invalidPath}`, Route.LogLevel.ERR);
          reject({
            statusCode: 400,
            message: `${this.schema.name}: Update path is invalid: ${validation.invalidPath}`
          });
          return;
        }
        if (validation.isValueValid === false) {
          this.log(`${this.schema.name}: Update value is invalid: ${validation.invalidValue}`, Route.LogLevel.ERR);
          if (validation.isMissingRequired) {
            reject({
              statusCode: 400,
              message: `${this.schema.name}: Missing required property updating ${this.req.body.path}: ${validation.missingRequired}`
            });
          } else {
            reject({
              statusCode: 400,
              message: `${this.schema.name}: Update value is invalid for path ${this.req.body.path}: ${validation.invalidValue}`
            });
          }
          return;
        }
      }

      this.model.exists(this.req.params.id)
        .then(exists => {
          if (!exists) {
            this.log('ERROR: Invalid ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          resolve(true);
        });
    });
  }

  _exec() {
    return this.model.updateByPath(this.req.body, this.req.params.id);
  }
}
routes.push(UpdateOne);

/**
 * @class DeleteOne
 */
class DeleteOne extends Route {
  constructor(schema) {
    super(`${schema.name}/:id`, `DELETE ${schema.name}`);
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.USER;
    this.permissions = Route.Constants.Permissions.DELETE;

    this.activityDescription = `ADD ${schema.name}`;
    this.activityBroadcast = true;

    this.schema = schema;
    this.model = Model[schema.collection];

    this._entity = false;
  }

  _validate() {
    return this.model.findById(this.req.params.id)
    .then(entity => {
      if (!entity) {
        this.log(`${this.schema.name}: Invalid ID`, Route.LogLevel.ERR);
        return {statusCode: 400};
      }
      this._entity = entity;
      return true;
    });
  }

  _exec() {
    return this.model.rm(this._entity)
    .then(() => true);
  }
}
routes.push(DeleteOne);

/**
 * @class DeleteAll
 */
class DeleteAll extends Route {
  constructor(schema) {
    super(`${schema.name}`, `DELETE ${schema.name}`);
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.DELETE;

    this.activityDescription = `DELETE ${schema.name}`;
    this.activityBroadcast = true;

    this.schema = schema;
    this.model = Model[schema.collection];
  }

  _validate() {
    return Promise.resolve();
  }

  _exec() {
    return this.model.rmAll()
    .then(() => true);
  }
}
routes.push(DeleteAll);

/**
 * @type {*[]}
 */
module.exports = routes;
