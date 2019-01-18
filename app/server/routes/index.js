'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file index.js
 * @description Model management
 * @module Routes
 * @author Chris Bates-Keegan
 *
 */

const fs = require('fs');
const path = require('path');
const Route = require('./route');
const Logging = require('../logging');
const Helpers = require('../helpers');
const Model = require('../model');
const Mongo = require('mongodb');

const SchemaRoutes = require('./schemaRoutes');

const _timer = new Helpers.Timer();

/**
 * @param {Object} app - express app object
 * @param {Function} Route - route object
 * @private
 */
function _initRoute(app, Route) {
	const route = new Route();
	app[route.verb](`/api/v1/${route.path}`, (req, res) => {
		Logging.logTimerException(`PERF: START: ${route.path}`, req.timer, 0.005);

		route
			.exec(req, res)
			.then((result) => {
				if (result instanceof Mongo.Cursor) {
					const stringifyStream = new Helpers.JSONStringifyStream();
					res.set('Content-Type', 'application/json');
					result.stream().pipe(stringifyStream).pipe(res);
				} else {
					res.json(Helpers.prepareResult(result));
				}
				Logging.logTimerException(`PERF: DONE: ${route.path}`, req.timer, 0.05);
				Logging.logTimer(`DONE: ${route.path}`, req.timer, Logging.Constants.LogLevel.VERBOSE);
			})
			.catch((err) => {
				Logging.logError(err);
				res.status(err.statusCode ? err.statusCode : 500).json({message: err.message});
			});
	});
}

/**
 * @param  {Object} express - express applcation container
 * @param  {Object} app - application container
 * @param  {Object} schema - schema object
 */
function _initSchemaRoutes(express, app, schema) {
	SchemaRoutes.forEach((Route) => {
		const route = new Route(schema);
		express[route.verb](`/api/v1/${route.path}`, (req, res) => {
			Logging.logTimerException(`PERF: START: ${route.path}`, req.timer, 0.005);

			route
				.exec(req, res)
				.then((result) => {
					if (result instanceof Mongo.Cursor) {
						const stringifyStream = new Helpers.JSONStringifyStream();
						res.set('Content-Type', 'application/json');
						result.stream().pipe(stringifyStream).pipe(res);
					} else {
						res.json(Helpers.prepareResult(result));
					}
					Logging.logTimerException(`PERF: DONE: ${route.path}`, req.timer, 0.05);
					Logging.logTimer(`DONE: ${route.path}`, req.timer, Logging.Constants.LogLevel.VERBOSE);
				})
				.catch((err) => {
					Logging.logError(err);
					res.status(err.statusCode ? err.statusCode : 500).json({message: err.message});
				});
		});
	});
}

let _tokens = [];

/**
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - next handler function
 * @private
 */
function _authenticateToken(req, res, next) {
	Logging.log(`Token: ${req.query.token}`, Logging.Constants.LogLevel.SILLY);
	req.session = null; // potentially prevents a write
	req.timer = _timer;
	req.timer.start();
	Logging.logVerbose(`START [${req.method.toUpperCase()}] ${req.path}`);

	if (!req.query.token) {
		Logging.log('EAUTH: Missing Token', Logging.Constants.LogLevel.ERR);
		res.status(400).json({message: 'missing_token'});
		return;
	}
	_getToken(req)
		.then((token) => {
			return new Promise((resolve, reject) => {
				if (token === null) {
					Logging.log('EAUTH: Invalid Token', Logging.Constants.LogLevel.ERR);
					res.status(401).json({message: 'invalid_token'});
					reject({message: 'invalid_token'});
					return;
				}

				Model.token = req.token = token;

				Model.Token.collection.update({_id: token._id}, {$push: {
					uses: new Date(),
				}});

				resolve(token);
			});
		})
		.then((token) => Model.App.findById(req.token._app))
		.then((app) => {
			Model.authApp = req.authApp = app;
		})
		.then((token) => Model.User.findById(req.token._user))
		.then((user) => {
			Model.authUser = req.authUser = user;
		})
		.then(Helpers.Promise.inject())
		.then(next)
		.catch((err) => {
			Logging.logError(err);
			res.status(503);
			res.end();
			return;
		});
}

/**
 * @param  {String} req - request object
	* @return {Promise} - resolves with the matching token if any
 */
function _getToken(req) {
	let token = null;

	if (_tokens.length > 0 && !Model.appMetadataChanged) {
		token = _lookupToken(_tokens, req.query.token);
		// Logging.log("Using Cached Tokens", Logging.Constants.LogLevel.DEBUG);
		if (token) {
			Logging.logSilly(`_getToken:Lookup: ${req.timer.interval.toFixed(3)}`);
			return Promise.resolve(token);
		}
	}

	return new Promise((resolve) => {
		Model.Token.findAll().toArray()
			.then(Logging.Promise.logArray('Tokens: ', Logging.Constants.LogLevel.SILLY))
			.then((tokens) => {
				Logging.logDebug(`_getToken:Load: ${req.timer.interval.toFixed(3)}`);
				_tokens = tokens;
				Model.appMetadataChanged = false;
				token = _lookupToken(_tokens, req.query.token);
				return resolve(token);
			});
	});
}

/**
 * @param {array} tokens - cached tokens
 * @param {string} value - token string to look for
 * @return {*} - false if not found, Token (native) if found
 * @private
 */
function _lookupToken(tokens, value) {
	const token = tokens.filter((t) => t.value === value);
	return token.length === 0 ? null : token[0];
}

/**
 * @return {Promise} - resolves with tokens
 * @private
 */
function _loadTokens() {
	return Model.Token.findAll().toArray()
		.then((tokens) => {
			_tokens = tokens;
		});
}

/**
 *
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - next handler function
 * @private
 */
function _configCrossDomain(req, res, next) {
	if (!req.token) {
		res.status(401).json({message: 'Auth token is required'});
		return;
	}
	if (req.token.type !== Model.Token.Constants.Type.USER) {
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
		res.header('Access-Control-Allow-Headers', 'content-type');
		next();
		return;
	}

	if (!req.authUser) {
		res.status(401).json({message: 'Auth user is required'});
		return;
	}

	const rex = /https?:\/\/(.+)$/;
	let origin = req.header('Origin');

	if (!origin) {
		origin = req.header('Host');
	}

	let matches = rex.exec(origin);
	if (matches) {
		origin = matches[1];
	}

	const domains = req.token.domains.map((d) => {
		matches = rex.exec(d);
		return matches ? matches[1] : d;
	});

	Logging.logSilly(origin);
	Logging.logSilly(domains);

	const domainIdx = domains.indexOf(origin);
	if (domainIdx === -1) {
		Logging.logError(new Error(`Invalid Domain: ${origin}`));
		res.sendStatus(403);
		return;
	}

	res.header('Access-Control-Allow-Origin', req.header('Origin'));
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
	res.header('Access-Control-Allow-Headers', 'content-type');

	if (req.method === 'OPTIONS') {
		res.sendStatus(200);
		return;
	}
	next();
}

/**
 * @param {Object} app - express app object
 * @param {Object} io - socket io object
 * @return {Promise} - resolves once the tokens have been pre-cached
 */
exports.init = (app) => {
	Route.app = app;

	app.get('/favicon.ico', (req, res, next) => res.sendStatus(404));
	app.get('/index.html', (req, res, next) => res.send('<html><head><title>ButtressJS</title></head></html>'));

	app.use(_authenticateToken);
	app.use(_configCrossDomain);

	return Model.App.findAll().toArray()
		.then((buttressApps) => {
		// Fetch app schemas and init
			buttressApps.forEach((buttressApp) => {
				if (buttressApp.__schema) {
					buttressApp.__schema.forEach((schema) => {
						_initSchemaRoutes(app, buttressApp, schema);
					});
				}
			});
		})
		.then(() => {
		// Fetch core routes and init
			const providers = _getRouteProviders();
			for (let x = 0; x < providers.length; x++) {
				const routes = providers[x];
				for (let y = 0; y < routes.length; y++) {
					const route = routes[y];
					_initRoute(app, route);
				}
			}
		})
		.then(() => _loadTokens());
};

/**
 * @return {Array} - returns an array of Route handlers
 * @private
 */
function _getRouteProviders() {
	const filenames = fs.readdirSync(`${__dirname}/api`);

	const files = [];
	for (let x = 0; x < filenames.length; x++) {
		const file = filenames[x];
		if (path.extname(file) === '.js') {
			files.push(require(`./api/${path.basename(file, '.js')}`));
		}
	}
	return files;
}
