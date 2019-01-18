'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file tracking.js
 * @description Tracking API specification
 * @module API
 * @author Chris Bates-Keegan
 *
 */

const Route = require('../route');
// const Model = require('../../model');
const os = require('os');

let routes = [];

/**
 * @class GetTrackingList
 */
class GetProcessStatus extends Route {
	constructor() {
		super('status', 'GET TRACKING LIST');
		this.verb = Route.Constants.Verbs.GET;
		this.auth = Route.Constants.Auth.SUPER;
		this.permissions = Route.Constants.Permissions.LIST;
	}

	_validate() {
		return Promise.resolve(true);
	}

	_exec() {
		const mem = process.memoryUsage().rss;
		const memTotal = os.totalmem();

		return {
			uptime: process.uptime(),
			memory: {
				used: mem,
				total: memTotal,
				percent: Number((mem / memTotal) * 100).toFixed(2)
			}
		};
	}
}
routes.push(GetProcessStatus);

/**
 * @type {*[]}
 */
module.exports = routes;
