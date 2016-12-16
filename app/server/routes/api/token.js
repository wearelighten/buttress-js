'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file token.js
 * @description TOKEN API specification
 * @module API
 * @author Chris Bates-Keegan
 *
 */

var Route = require('../route');
var Model = require('../../model');
// var Logging = require('../../logging');
// var Helpers = require('../../helpers');

var routes = [];

/**
 * @class GetTokenList
 */
class GetTokenList extends Route {
  constructor() {
    super('token', 'GET TOKEN LIST');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.LIST;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Token.getAll()
    .then(tokens => tokens.map(t => t.details));
  }
}
routes.push(GetTokenList);

/**
 * @class DeleteAllTokens
 */
class DeleteAllTokens extends Route {
  constructor() {
    super('token/:type?', 'DELETE ALL TOKENS');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.DELETE;
  }

  _validate() {
    return Promise.resolve(this.req.params.type === 'user');
  }

  _exec() {
    return Model.Token.rmAll(this.req.params.type).then(() => true);
  }
}
routes.push(DeleteAllTokens);

/**
 * @type {*[]}
 */
module.exports = routes;
