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
 *
 * @type {{routes: {app: {get: GetList}}}}
 */
module.exports = [
  GetList
];
