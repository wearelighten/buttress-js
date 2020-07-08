'use strict';

/**
 * ButtressJS - Realtime datastore for software
 *
 * @file tracking.js
 * @description Tracking API specification
 * @module API
 * @author Chris Bates-Keegan
 *
 */

const Route = require('../route');
const Model = require('../../model');
const Helpers = require('../../helpers');

const routes = [];

/**
 * @class GetTrackingList
 */
class GetTrackingList extends Route {
	constructor() {
		super('tracking', 'GET TRACKING LIST');
		this.verb = Route.Constants.Verbs.GET;
		this.auth = Route.Constants.Auth.ADMIN;
		this.permissions = Route.Constants.Permissions.LIST;
	}

	_validate(req, res, token) {
		return Promise.resolve(true);
	}

	_exec(req, res, validate) {
		return Model.Tracking.getAll();
	}
}
routes.push(GetTrackingList);

/**
 * @class AddTracking
 */
class AddTracking extends Route {
	constructor() {
		super('tracking', 'ADD TRACKING');
		this.verb = Route.Constants.Verbs.POST;
		this.auth = Route.Constants.Auth.USER;
		this.permissions = Route.Constants.Permissions.ADD;

		this.activityVisibility = Model.Activity.Constants.Visibility.PRIVATE;
		this.activityBroadcast = false;
	}

	_validate(req, res, token) {
		return new Promise((resolve, reject) => {
			const validation = Model.Tracking.validate(req.body);
			if (!validation.isValid) {
				if (validation.missing.length > 0) {
					this.log(`ERROR: Missing field: ${validation.missing[0]}`, Route.LogLevel.ERR);
					return reject(new Helpers.RequestError(400, `TRACKING: Missing field: ${validation.missing[0]}`));
				}
				if (validation.invalid.length > 0) {
					this.log(`ERROR: Invalid value: ${validation.invalid[0]}`, Route.LogLevel.ERR);
					return reject(new Helpers.RequestError(400, `TRACKING: Invalid value: ${validation.invalid[0]}`));
				}

				this.log(`ERROR: TRACKING: Unhandled Error`, Route.LogLevel.ERR);
				return reject(new Helpers.RequestError(400, `unknown_error`));
			}

			resolve(true);
		});
	}

	_exec(req, res, validate) {
		return Model.Tracking.add(req.body);
	}
}
routes.push(AddTracking);

class UpdateTracking extends Route {
	constructor() {
		super('tracking/:id', 'UPDATE TRACKING');
		this.verb = Route.Constants.Verbs.PUT;
		this.auth = Route.Constants.Auth.ADMIN;
		this.permissions = Route.Constants.Permissions.WRITE;

		this.activityVisibility = Model.Activity.Constants.Visibility.PRIVATE;
		this.activityBroadcast = true;
	}

	_validate() {
		return new Promise((resolve, reject) => {
			const validation = Model.Tracking.validateUpdate(this.req.body);
			if (!validation.isValid) {
				if (validation.isPathValid === false) {
					this.log(`ERROR: Update path is invalid: ${validation.invalidPath}`, Route.LogLevel.ERR);
					return reject(new Helpers.RequestError(400, `TRACKING: Update path is invalid: ${validation.invalidPath}`));
				}
				if (validation.isValueValid === false) {
					this.log(`ERROR: Update value is invalid: ${validation.invalidValue}`, Route.LogLevel.ERR);
					return reject(new Helpers.RequestError(400, `TRACKING: Update value is invalid: ${validation.invalidValue}`));
				}
			}

			Model.Tracking.exists(this.req.params.id)
				.then((exists) => {
					if (!exists) {
						this.log('ERROR: Invalid Tracking ID', Route.LogLevel.ERR);
						return reject(new Helpers.RequestError(400, `invalid_id`));
					}
					resolve(true);
				});
		});
	}

	_exec() {
		return Model.Tracking.updateByPath(this.req.body, this.req.params.id);
	}
}
routes.push(UpdateTracking);

/**
 * @class DeleteTracking
 */
class DeleteTracking extends Route {
	constructor() {
		super('tracking/:id', 'DELETE TRACKING');
		this.verb = Route.Constants.Verbs.DEL;
		this.auth = Route.Constants.Auth.ADMIN;
		this.permissions = Route.Constants.Permissions.DELETE;
		this._tracking = false;
	}

	_validate(req, res, token) {
		return new Promise((resolve, reject) => {
			Model.Tracking.findById(req.params.id)
				.then((tracking) => {
					if (!tracking) {
						this.log('ERROR: Invalid Tracking ID', Route.LogLevel.ERR);
						return reject(new Helpers.RequestError(400, `invalid_id`));
					}
					this._tracking = tracking;
					resolve(true);
				});
		});
	}

	_exec(req, res, validate) {
		return this._tracking.rm().then(() => true);
	}
}
routes.push(DeleteTracking);

/**
 * @class DeleteAllTrackings
 */
class DeleteAllTrackings extends Route {
	constructor() {
		super('tracking', 'DELETE ALL TRACKINGS');
		this.verb = Route.Constants.Verbs.DEL;
		this.auth = Route.Constants.Auth.SUPER;
		this.permissions = Route.Constants.Permissions.DELETE;
	}

	_validate(req, res, token) {
		return Promise.resolve(true);
	}

	_exec(req, res, validate) {
		return Model.Tracking.rmAll().then(() => true);
	}
}
routes.push(DeleteAllTrackings);

/**
 * @type {*[]}
 */
module.exports = routes;
