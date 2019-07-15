'use strict';

/**
 * ButtressJS - Realtime datastore for software
 *
 * @file schemaRoutes.js
 * @description A list of default routes for schema
 * @module routes
 * @author Chris Bates-Keegan
 *
 */

const Logging = require('../logging');
const Route = require('./route');
const Model = require('../model');
// const Helpers = require('../../helpers');

const routes = [];

/**
 * @class GetList
 */
class GetList extends Route {
	constructor(schema) {
		super(`${schema.name}`, `GET ${schema.name} LIST`);
		this.verb = Route.Constants.Verbs.GET;
		this.auth = Route.Constants.Auth.USER;
		this.permissions = Route.Constants.Permissions.LIST;

		this.activityDescription = `GET ${schema.name} LIST`;
		this.activityBroadcast = false;

		// Fetch model
		this.schema = schema;
		this.model = Model[schema.collection];
		if (!this.model) {
			// Somthing went wrong!!1?
		}
	}

	_validate(req, res, token) {
		let query = Promise.resolve({});
		if (token.authLevel < 3) {
			query = this.model.generateRoleFilterQuery(token, req.roles, Model);
		}

		return query;
	}

	_exec(req, res, query) {
		return this.model.find(query);
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

		this.activityDescription = `GET ${schema.name}`;
		this.activityBroadcast = false;

		this.schema = schema;
		this.model = Model[schema.collection];
	}

	_validate(req, res, token) {
		return new Promise((resolve, reject) => {
			this.model.findById(req.params.id)
				.then((entity) => {
					if (!entity) {
						this.log(`${this.schema.name}: Invalid ID: ${req.params.id}`, Route.LogLevel.ERR);
						reject({statusCode: 400});
						return;
					}
					resolve(entity);
				});
		});
	}

	_exec(req, res, entity) {
		return Promise.resolve(entity);
	}
}
routes.push(GetOne);

/**
 * @class GetMany
 */
class GetMany extends Route {
	constructor(schema) {
		super(`${schema.name}/bulk/load`, `BULK GET ${schema.name}`);
		this.verb = Route.Constants.Verbs.POST;
		this.auth = Route.Constants.Auth.ADMIN;
		this.permissions = Route.Constants.Permissions.READ;

		this.activityDescription = `BULK GET ${schema.name}`;
		this.activityBroadcast = false;

		this.schema = schema;
		this.model = Model[schema.collection];
	}

	_validate(req, res, token) {
		return new Promise((resolve, reject) => {
			const _ids = req.body;
			if (!_ids) {
				this.log(`ERROR: No ${this.schema.name} IDs provided`, Route.LogLevel.ERR);
				reject({statusCode: 400});
				return;
			}
			if (!_ids.length) {
				this.log(`ERROR: No ${this.schema.name} IDs provided`, Route.LogLevel.ERR);
				reject({statusCode: 400});
				return;
			}
			resolve(_ids);
		});
	}

	_exec(req, res, ids) {
		return this.model.findAllById(ids);
	}
}
routes.push(GetMany);

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

	_validate(req, res, token) {
		return new Promise((resolve, reject) => {
			const validation = this.model.validate(req.body);
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

			this.model.isDuplicate(req.body)
				.then((res) => {
					if (res === true) {
						this.log(`${this.schema.name}: Duplicate entity`, Route.LogLevel.ERR);
						reject({statusCode: 400});
						return;
					}
					resolve(true);
				});
		});
	}

	_exec(req, res, validate) {
		return this.model.add(req.body);
	}
}
routes.push(AddOne);

/**
 * @class AddMany
 */
class AddMany extends Route {
	constructor(schema) {
		super(`${schema.name}/bulk/add`, `BULK ADD ${schema.name}`);
		this.verb = Route.Constants.Verbs.POST;
		this.auth = Route.Constants.Auth.ADMIN;
		this.permissions = Route.Constants.Permissions.ADD;

		this.activityDescription = `BULK ADD ${schema.name}`;
		this.activityBroadcast = true;

		this.schema = schema;
		this.model = Model[schema.collection];
	}

	_validate(req, res, token) {
		return new Promise((resolve, reject) => {
			const entities = req.body;
			if (entities instanceof Array === false) {
				this.log(`ERROR: You need to supply an array of ${this.schema.name}`, Route.LogLevel.ERR);
				reject({statusCode: 400, message: `Invalid data: send an array`});
				return;
			}
			// if (companies.length > 601) {
			//   this.log(`ERROR: No more than 300`, Route.LogLevel.ERR);
			//   reject({statusCode: 400, message: `Invalid data: send no more than 300 ${this.schema.name} at a time`});
			//   return;
			// }

			const validation = this.model.validate(entities);
			if (!validation.isValid) {
				if (validation.missing.length > 0) {
					this.log(`ERROR: Missing field: ${validation.missing[0]}`, Route.LogLevel.ERR);
					reject({statusCode: 400, message: `${this.schema.name}: Missing field: ${validation.missing[0]}`});
					return;
				}
				if (validation.invalid.length > 0) {
					this.log(`ERROR: Invalid value: ${validation.invalid[0]}`, Route.LogLevel.ERR);
					reject({statusCode: 400, message: `${this.schema.name}: Invalid value: ${validation.invalid[0]}`});
					return;
				}

				this.log(`ERROR: ${this.schema.name}: Unhandled Error`, Route.LogLevel.ERR);
				reject({statusCode: 400, message: `${this.schema.name}: Unhandled error.`});
				return;
			}
			resolve(entities);
		});
	}

	_exec(req, res, entities) {
		return this.model.add(entities)
			.then(Logging.Promise.logProp(`Added ${this.schema.name}`, 'length', Route.LogLevel.VERBOSE));
	}
}
routes.push(AddMany);

/**
 * @class UpdateOne
 */
class UpdateOne extends Route {
	constructor(schema) {
		super(`${schema.name}/:id`, `UPDATE ${schema.name}`);
		this.verb = Route.Constants.Verbs.PUT;
		this.auth = Route.Constants.Auth.USER;
		this.permissions = Route.Constants.Permissions.WRITE;

		this.activityDescription = `UPDATE ${schema.name}`;
		this.activityBroadcast = true;

		this.schema = schema;
		this.model = Model[schema.collection];

		this._entity = null;
	}

	_validate(req, res, token) {
		return new Promise((resolve, reject) => {
			const validation = this.model.validateUpdate(req.body);
			if (!validation.isValid) {
				if (validation.isPathValid === false) {
					this.log(`${this.schema.name}: Update path is invalid: ${validation.invalidPath}`, Route.LogLevel.ERR);
					reject({
						statusCode: 400,
						message: `${this.schema.name}: Update path is invalid: ${validation.invalidPath}`,
					});
					return;
				}
				if (validation.isValueValid === false) {
					this.log(`${this.schema.name}: Update value is invalid: ${validation.invalidValue}`, Route.LogLevel.ERR);
					if (validation.isMissingRequired) {
						reject({
							statusCode: 400,
							message: `${this.schema.name}: Missing required property updating ${req.body.path}: ${validation.missingRequired}`,
						});
					} else {
						reject({
							statusCode: 400,
							message: `${this.schema.name}: Update value is invalid for path ${req.body.path}: ${validation.invalidValue}`,
						});
					}
					return;
				}
			}

			this.model.exists(req.params.id)
				.then((exists) => {
					if (!exists) {
						this.log('ERROR: Invalid ID', Route.LogLevel.ERR);
						reject({statusCode: 400});
						return;
					}
					resolve(true);
				});
		});
	}

	_exec(req, res, validate) {
		return this.model.updateByPath(req.body, req.params.id);
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

		this.activityDescription = `DELETE ${schema.name}`;
		this.activityBroadcast = true;

		this.schema = schema;
		this.model = Model[schema.collection];

		this._entity = false;
	}

	_validate(req, res, token) {
		return this.model.findById(req.params.id)
			.then((entity) => {
				if (!entity) {
					this.log(`${this.schema.name}: Invalid ID`, Route.LogLevel.ERR);
					return {statusCode: 400};
				}
				this._entity = entity;
				return true;
			});
	}

	_exec(req, res, validate) {
		return this.model.rm(this._entity)
			.then(() => true);
	}
}
routes.push(DeleteOne);

/**
 * @class DeleteMany
 */
class DeleteMany extends Route {
	constructor(schema) {
		super(`${schema.name}/bulk/delete`, `BULK DELETE ${schema.name}`);
		this.verb = Route.Constants.Verbs.POST;
		this.auth = Route.Constants.Auth.ADMIN;
		this.permissions = Route.Constants.Permissions.DELETE;

		this.activityDescription = `BULK DELETE ${schema.name}`;
		this.activityBroadcast = true;

		this.schema = schema;
		this.model = Model[schema.collection];
	}

	_validate(req, res, token) {
		return new Promise((resolve, reject) => {
			const ids = req.body;
			if (!ids) {
				this.log(`ERROR: No ${this.schema.name} IDs provided`, Route.LogLevel.ERR);
				reject({statusCode: 400, message: `ERROR: No ${this.schema.name} IDs provided`});
				return;
			}
			if (!ids.length) {
				this.log(`ERROR: No ${this.schema.name} IDs provided`, Route.LogLevel.ERR);
				reject({statusCode: 400, message: `ERROR: No ${this.schema.name} IDs provided`});
				return;
			}
			// if (this._ids.length > 600) {
			//   this.log('ERROR: No more than 300 company IDs are supported', Route.LogLevel.ERR);
			//   reject({statusCode: 400, message: 'ERROR: No more than 300 company IDs are supported'});
			//   return;
			// }
			resolve(ids);
		});
	}

	_exec(req, res, ids) {
		return this.model.rmBulk(ids)
			.then(() => true);
	}
}
routes.push(DeleteMany);

/**
 * @class DeleteAll
 */
class DeleteAll extends Route {
	constructor(schema) {
		super(`${schema.name}`, `DELETE ALL ${schema.name}`);
		this.verb = Route.Constants.Verbs.DEL;
		this.auth = Route.Constants.Auth.SUPER;
		this.permissions = Route.Constants.Permissions.DELETE;

		this.activityDescription = `DELETE ALL ${schema.name}`;
		this.activityBroadcast = true;

		this.schema = schema;
		this.model = Model[schema.collection];
	}

	_validate(req, res, token) {
		return Promise.resolve();
	}

	_exec(req, res, validate) {
		return this.model.rmAll()
			.then(() => true);
	}
}
routes.push(DeleteAll);

/**
 * @type {*[]}
 */
module.exports = routes;
