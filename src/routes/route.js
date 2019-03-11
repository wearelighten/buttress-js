'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file route.js
 * @description Route Class - Route authorisation (against app permissions), validation and execution
 * @module System
 * @author Chris Bates-Keegan
 *
 */

const Config = require('node-env-obj')('../');
const Logging = require('../logging');
const Model = require('../model');
const Mongo = require('mongodb');
const NRP = require('node-redis-pubsub');
const Helpers = require('../helpers');

const nrp = new NRP(Config.redis);

/**
 */
// var _otp = OTP.create({
//   length: 12,
//   mode: OTP.Constants.Mode.ALPHANUMERIC,
//   salt: Config.RHIZOME_OTP_SALT,
//   tolerance: 3
// });

let _app = null;
let _io = null;

/**
 * @type {{Auth: {
 *          NONE: number,
 *          USER: number,
 *          ADMIN: number,
 *          SUPER: number},
 *         Permissions: {
 *          NONE: string,
 *          ADD: string,
 *          READ: string,
 *          WRITE: string,
 *          LIST: string,
 *          DELETE: string,
 *          ALL: string
*          },
 *         Verbs: {
 *          GET: string,
 *          POST: string,
 *          PUT: string,
 *          DEL: string
*          }}}
 */
const Constants = {
	Auth: {
		NONE: 0,
		USER: 1,
		ADMIN: 2,
		SUPER: 3,
	},
	Permissions: {
		NONE: '',
		ADD: 'add',
		READ: 'read',
		WRITE: 'write',
		LIST: 'list',
		DELETE: 'delete',
		ALL: '*',
	},
	Verbs: {
		GET: 'get',
		POST: 'post',
		PUT: 'put',
		DEL: 'delete',
	},
};

class Route {
	constructor(path, name) {
		this.verb = Constants.Verbs.GET;
		this.auth = Constants.Auth.SUPER;
		this.permissions = Constants.Permissions.READ;
		this.activityBroadcast = false;
		this.activityVisibility = Model.Activity.Constants.Visibility.PRIVATE;
		this.activityTitle = 'Private Activity';
		this.activityDescription = '';

		this.schema = null;
		this.model = null;

		this.path = path;
		this.name = name;
	}

	/**
	 * @param {Object} req - ExpressJS request object
	 * @param {Object} res - ExpresJS response object
	 * @return {Promise} - Promise is fulfilled once execution has completed
	 */
	exec(req, res) {
		this._timer = req.timer;

		return new Promise((resolve, reject) => {
			if (!this._exec) {
				this.log(`Error: ${this.name}: No _exec defined`, Logging.Constants.LogLevel.ERR);
				reject({statusCode: 500});
				return;
			}

			this._authenticate(req, res)
				.then(Logging.Promise.logTimer(`AUTHENTICATED: ${this.name}`, this._timer, Logging.Constants.LogLevel.SILLY))
				.then(Logging.Promise.logSilly('authenticated'))
				.then((token) => this._validate(req, res, token), reject)
				.then(Logging.Promise.logTimer(`VALIDATED: ${this.name}`, this._timer, Logging.Constants.LogLevel.SILLY))
				.then(Logging.Promise.logSilly('validated'))
				.then((validate) => this._exec(req, res, validate), reject)
				.then(Logging.Promise.logTimer(`EXECUTED: ${this.name}`, this._timer, Logging.Constants.LogLevel.SILLY))
				.then((result) => this._logActivity(req, res, result), reject)
				.then(resolve, reject)
				.catch(Logging.Promise.logError());
		});
	}

	_logActivity(req, res, result) {
		Logging.logSilly(`logging activity: [${this.verb}] ${this.path} (${this.auth}:${this.permissions})`);
		if (result instanceof Mongo.Cursor || this.verb === Constants.Verbs.GET) {
			return Promise.resolve(result);
		}

		let addActivty = true;

		// Early out if tracking, we don't wan't to create activity for this
		if (this.path === 'tracking') {
			addActivty = false;
		}
		if (this.path === 'user/:app?') {
			addActivty = false;
		}

		const broadcast = () => {
			if (res) {
				const appPId = Model.App.genPublicUID(req.authApp.name, req.token.value);
				this._activityBroadcastSocket({
					title: this.activityTitle,
					description: this.activityDescription,
					visibility: this.activityVisibility,
					broadcast: this.activityBroadcast,
					path: req.path,
					pathSpec: this.path,
					params: req.params,
					verb: this.verb,
					permissions: this.permissions,
				}, result, appPId);
			}
		};

		setTimeout(() => {
			// Craft activity object and add
			if (addActivty) {
				this._addLogActivity(req, this.path, this.verb);
			}
			broadcast();
		}, 50);

		return Promise.resolve(result);
	}

	_addLogActivity(req, path, verb) {
		return Model.Activity.add({
			activityTitle: this.activityTitle,
			activityDescription: this.activityDescription,
			activityVisibility: this.activityVisibility,
			path: path,
			verb: verb,
			permissions: this.permissions,
			auth: this.auth,
			params: req.params,
			req: {
				query: req.query,
				body: req.body,
				params: req.params,
			},
			res: {},
		})
			.then((activity) => {
			// Activity doesn't get added via the API so we will just broadcast the data manually
				this._activityBroadcastSocket({
					title: 'Private Activity',
					description: 'ADD ACTIVITY',
					visibility: 'private',
					broadcast: false,
					path: `activity`,
					pathSpec: 'activity',
					verb: 'post',
					params: activity.params,
					permissions: 'write',
				}, activity);
			})
			.catch((e) => {
				Logging.logError(`[${verb.toUpperCase()}] ${path}`);
				Logging.logError(req.body);
				Logging.logError(e);
			});
	}

	_activityBroadcastSocket(activity, res, appPid) {
		nrp.emit('activity', {
			title: activity.title,
			description: activity.description,
			visibility: activity.visibility,
			broadcast: activity.broadcast,
			path: activity.path.replace(Config.app.apiPrefix, ''),
			pathSpec: activity.pathSpec,
			verb: activity.verb,
			permissions: activity.permissions,
			params: activity.params,
			timestamp: new Date(),
			response: Helpers.prepareResult(res),
			user: Model.authUser ? Model.authUser._id : '',
			appPId: appPid ? appPid : '',
		});
	}

	/**
	 * @param {Object} req - ExpressJS request object
	 * @param {Object} res - ExpresJS response object
	 * @return {Promise} - Promise is fulfilled once the authentication is completed
	 * @private
	 */
	_authenticate(req, res) {
		return new Promise((resolve, reject) => {
			if (this.auth === Constants.Auth.NONE) {
				this.log(`WARN: OPEN API CALL`, Logging.Constants.LogLevel.WARN);
				resolve(req.user);
				return;
			}

			if (!req.token) {
				this.log('EAUTH: INVALID TOKEN', Logging.Constants.LogLevel.ERR);
				reject({statusCode: 401});
				return;
			}
			this.log(req.token.value, Logging.Constants.LogLevel.SILLY);

			this.log(`AUTHLEVEL: ${this.auth}`, Logging.Constants.LogLevel.VERBOSE);
			if (req.token.authLevel < this.auth) {
				this.log('EAUTH: INSUFFICIENT AUTHORITY', Logging.Constants.LogLevel.ERR);
				reject({statusCode: 401});
				return;
			}

			/**
			 * @description Route:
			 *  '*' - all routes (SUPER)
			 *  'route' - specific route (ALL)
			 *  'route/subroute' - specific route (ALL)
			 *  'route/*' name plus all children (ADMIN)
			 * @TODO Improve the pattern matching granularity ie like Glob
			 * @TODO Support Regex in specific ie match routes like app/:id/permission
			 */
			let authorised = false;
			const token = req.token;
			Logging.logSilly(token.permissions);
			for (let x = 0; x < token.permissions.length; x++) {
				const p = token.permissions[x];
				if (this._matchRoute(req, p.route) && this._matchPermission(p.permission)) {
					authorised = true;
					break;
				}
			}

			if (authorised === false) {
				this.log(token.permissions, Logging.Constants.LogLevel.ERR);
				this.log(`EAUTH: NO PERMISSION FOR ROUTE - ${this.path}`, Logging.Constants.LogLevel.ERR);
				reject({statusCode: 401});
			}

			// BYPASS schema checks for app tokens
			if (req.token.type === 'app') {
				resolve(req.token);
				return;
			}

			/*
			 * Start of Route schema permissions
			 */
			if (this.schema) {
				authorised = false;

				// HACK - BYPASS Permissions for company / service
				if (['company', 'service'].includes(this.schema.name)) {
					return resolve(req.token);
				}

				Logging.logSilly(`SAUTH: TOKEN ROLE - ${req.token.role}`);

				// Default endpoint disposition this
				const disposition = {
					GET: 'deny',
					PUT: 'deny',
					POST: 'deny',
					DELETE: 'deny',
				};

				// Fetch app roles if they exist
				let appRoles = null;
				if (req.authApp && req.authApp.__roles && req.authApp.__roles.roles) {
					// This needs to be cached on startup
					appRoles = Helpers.flattenRoles(req.authApp.__roles);
				}

				// Check endpointDisposition against app roles it exists
				if (appRoles) {
					const role = appRoles.find((r) => r.name === req.token.role);
					Logging.logSilly(`SAUTH: MATCHED APP ROLE - ${req.token.role}`);
					if (role && role.endpointDisposition) {
						if (role.endpointDisposition === 'allowAll') {
							disposition.GET = 'allow';
							disposition.PUT = 'allow';
							disposition.POST = 'allow';
							disposition.DELETE = 'allow';
						}
					}
				}

				// If schema has endpointDisposition roles set for the role then
				// user the defined settings instead.
				if (this.schema.roles) {
					const role = this.schema.roles.find((r) => r.name === req.token.role);
					Logging.logSilly(`SAUTH: MATCHED SCEHMA ROLE - ${req.token.role}`);
					if (role && role.endpointDisposition) {
						if (role.endpointDisposition.GET) disposition.GET = role.endpointDisposition.GET;
						if (role.endpointDisposition.PUT) disposition.PUT = role.endpointDisposition.PUT;
						if (role.endpointDisposition.POST) disposition.POST = role.endpointDisposition.POST;
						if (role.endpointDisposition.DELETE) disposition.DELETE = role.endpointDisposition.DELETE;
					}
				}

				// Check the role has permission on this endpoint
				if (disposition[this.verb.toUpperCase()] && disposition[this.verb.toUpperCase()] === 'allow') {
					authorised = true;
				}

				if (authorised === false) {
					this.log(token.permissions, Logging.Constants.LogLevel.ERR);
					this.log(`SAUTH: NO PERMISSION FOR ROUTE - ${this.path}`, Logging.Constants.LogLevel.ERR);
					reject({statusCode: 403});
				}
			}

			resolve(req.token);
		});
	}

	/**
	 * @param {object} req - The request object to be compared to
	 * @param {string} routeSpec - See above for accepted route specs
	 * @return {boolean} - true if the route is authorised
	 * @private
	 */
	_matchRoute(req, routeSpec) {
		// if (routeSpec === '*' && req.token.authLevel >= Constants.Auth.SUPER) {
		if (routeSpec === '*') {
			return true;
		}

		if (routeSpec === this.path) {
			return true;
		}

		const userWildcard = /^user\/me.+/;
		if (routeSpec.match(userWildcard) && req.params.id == req.authUser._id) { // eslint-disable-line eqeqeq
			Logging.logSilly(`Matched user ${req.authUser._id} to /user/${req.params.id}`);
			return true;
		}

		const wildcard = /(.+)(\/\*)/;
		const matches = routeSpec.match(wildcard);
		if (matches) {
			Logging.logSilly(matches);
			if (this.path.match(new RegExp(`^${matches[1]}`)) &&
				req.token.authLevel >= Constants.Auth.ADMIN) {
				return true;
			}
		}

		return false;
	}

	/**
	 * @param {string} permissionSpec -
	 * @return {boolean} - true if authorised
	 * @private
	 */
	_matchPermission(permissionSpec) {
		if (permissionSpec === '*' || permissionSpec === this.permissions) {
			return true;
		}

		return false;
	}

	/**
	 * @param {string} log - log text
	 * @param {enum} level - NONE, ERR, WARN, INFO
	 */
	log(log, level) {
		level = level || Logging.Constants.LogLevel.INFO;
		Logging.log(log, level);
	}

	static set app(app) {
		_app = app;
	}
	static get app() {
		return _app;
	}
	static set io(io) {
		_io = io;
	}
	static get io() {
		return _io;
	}
	static get Constants() {
		return Constants;
	}

	/**
	 * @return {enum} - returns the LogLevel enum (convenience)
	 */
	static get LogLevel() {
		return Logging.Constants.LogLevel;
	}
}

module.exports = Route;
