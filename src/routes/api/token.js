'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file token.js
 * @description TOKEN API specification
 * @module API
 * @author Chris Bates-Keegan
 *
 */

const Route = require('../route');
const Model = require('../../model');
// var Logging = require('../../logging');
// var Helpers = require('../../helpers');

const routes = [];

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

	_validate(req, res, token) {
		return Promise.resolve(true);
	}

	_exec(req, res, validate) {
		return Model.Token.getAll()
			.then((tokens) => tokens.map((t) => t.details));
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

	_validate(req, res, token) {
		return Promise.resolve(req.params.type === 'user');
	}

	_exec(req, res, validate) {
		return Model.Token.rmAll({
			type: req.params.type,
		}).then(() => true);
	}
}
routes.push(DeleteAllTokens);

/**
 * @type {*[]}
 */
module.exports = routes;
