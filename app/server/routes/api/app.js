'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file index.js
 * @description Model management
 * @module Model
 * @author Chris Bates-Keegan
 *
 */

var Route = require('../route');
var Model = require('../../model');
var Logging = require('../../logging');

/**
 * @class GetList
 */
class GetList extends Route {
  constructor() {
    super('app', 'APP GET LIST');
    this.auth = Route.Constants.Auth.NONE;
    this.verb = Route.Constants.Verbs.GET;
    this.permissions = Route.Constants.Permissions.READ;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      resolve(true);
    });
  }

  _exec() {
    return new Promise((resolve, reject) => {
      resolve(['a', 'b', 'c']);
    });
  }
}

/**
 * @class AddApp
 */
class AddApp extends Route {
  constructor() {
    super('app', 'APP ADD');
    this.auth = Route.Constants.Auth.NONE;
    this.verb = Route.Constants.Verbs.POST;
    this.permissions = Route.Constants.Permissions.WRITE;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.body.name || !this.req.body.type) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }
      if (this.req.body.type === Model.Constants.App.Type.Browser && !this.req.body.domain) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }
      resolve(true);
    });
  }

  _exec() {
    return new Promise((resolve, reject) => {
      Model.App.add(this.req.body)
        .then(Logging.Promise.logProp('Added App', 'details', Route.LogLevel.INFO))
        .then(resolve, reject);
    });
  }
}

/**
 * @type {*[]}
 */
module.exports = [
  GetList,
  AddApp
];
