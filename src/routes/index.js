'use strict';

/**
 * ButtressJS - Realtime datastore for software
 *
 * @file index.js
 * @description Model management
 * @module Routes
 * @author Chris Bates-Keegan
 *
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
// const Route = require('./route');
const Logging = require('../logging');
const Schema = require('../schema');
const Helpers = require('../helpers');
const Model = require('../model');
const Mongo = require('mongodb');
const Config = require('node-env-obj')('../');

const SchemaRoutes = require('./schemaRoutes');

/**
 * @param {Object} app - express app object
 * @param {Function} Route - route object
 * @private
 */
function _initRoute(app, Route) {
	const route = new Route();
	const routePath = path.join(...[
		Config.app.apiPrefix,
		route.path,
	]);
	Logging.logSilly(`_initRoute:register [${route.verb.toUpperCase()}] ${routePath}`);
	app[route.verb](routePath, (req, res, next) => route.exec(req, res).catch(next));
}

/**
 * @param  {Object} express - express applcation container
 * @param  {Object} app - app data object
 * @param  {Object} schemaData - schema data object
 */
function _initSchemaRoutes(express, app, schemaData) {
	SchemaRoutes.forEach((Route) => {
		const appShortId = Helpers.shortId(app._id);
		const route = new Route(schemaData, appShortId);
		let routePath = path.join(...[
			(app.apiPath) ? app.apiPath : appShortId,
			Config.app.apiPrefix,
			route.path,
		]);
		if (routePath.indexOf('/') !== 0) routePath = `/${routePath}`;
		Logging.logSilly(`_initSchemaRoutes:register [${route.verb.toUpperCase()}] ${routePath}`);
		express[route.verb](routePath, (req, res, next) => route.exec(req, res).catch(next));
	});
}

let _tokens = [];

function _timeRequest(req, res, next) {
	// Just assign a arbitrary id to the request to help identify it in the logs
	req.id = new Mongo.ObjectID();
	req.timer = new Helpers.Timer();
	req.timer.start();
	Logging.logTimer(`[${req.method.toUpperCase()}] ${req.path}`, req.timer, Logging.Constants.LogLevel.SILLY, req.id);
	next();
}

/**
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - next handler function
 * @private
 */
function _authenticateToken(req, res, next) {
	Logging.logTimer(`_authenticateToken:start ${req.query.token}`,
		req.timer, Logging.Constants.LogLevel.SILLY, req.id);

	if (!req.query.token) {
		Logging.logTimer(`_authenticateToken:end-missing-token`, req.timer, Logging.Constants.LogLevel.SILLY, req.id);
		res.status(400).json({message: 'missing_token'});
		return;
	}

	_getToken(req)
		.then((token) => {
			return new Promise((resolve, reject) => {
				if (token === null) {
					Logging.logTimer(`_authenticateToken:end-missing-token`, req.timer, Logging.Constants.LogLevel.SILLY, req.id);
					reject(new Helpers.RequestError(401, 'invalid_token'));
					return;
				}

				req.token = token;

				resolve(token);
			});
		})
		.then(() => (req.token._app) ? Model.App.findById(req.token._app) : null)
		.then((app) => {
			Model.authApp = req.authApp = app;
		})
		.then(() => (req.token._user) ? Model.User.findById(req.token._user) : null)
		.then((user) => {
			req.authUser = user;
		})
		.then(Logging.Promise.logTimer('_authenticateToken:end', req.timer, Logging.Constants.LogLevel.SILLY, req.id))
		.then(next)
		.catch(next);
}

/**
 * @param  {String} req - request object
	* @return {Promise} - resolves with the matching token if any
 */
function _getToken(req) {
	Logging.logTimer('_getToken:start', req.timer, Logging.Constants.LogLevel.SILLY, req.id);
	let token = null;

	if (_tokens.length > 0 && !Model.appMetadataChanged) {
		token = _lookupToken(_tokens, req.query.token);
		if (token) {
			Logging.logTimer('_getToken:end-cache', req.timer, Logging.Constants.LogLevel.SILLY, req.id);
			return Promise.resolve(token);
		}
	}

	return new Promise((resolve) => {
		Model.Token.findAll().toArray()
			.then((tokens) => {
				_tokens = tokens;
				Model.appMetadataChanged = false;
				token = _lookupToken(_tokens, req.query.token);
				Logging.logTimer('_getToken:end-lookup', req.timer, Logging.Constants.LogLevel.SILLY, req.id);
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
	Logging.logTimer('_configCrossDomain:start', req.timer, Logging.Constants.LogLevel.SILLY, req.id);
	if (!req.token) {
		res.status(401).json({message: 'Auth token is required'});
		Logging.logTimer('_configCrossDomain:end-no-auth', req.timer, Logging.Constants.LogLevel.SILLY, req.id);
		return;
	}
	if (req.token.type !== Model.Token.Constants.Type.USER) {
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
		res.header('Access-Control-Allow-Headers', 'content-type');
		Logging.logTimer('_configCrossDomain:end-app-token', req.timer, Logging.Constants.LogLevel.SILLY, req.id);
		next();
		return;
	}

	if (!req.authUser) {
		res.status(401).json({message: 'Auth user is required'});
		Logging.logTimer('_configCrossDomain:end-no-auth-user', req.timer, Logging.Constants.LogLevel.SILLY, req.id);
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

	Logging.logSilly(`_configCrossDomain:origin ${origin}`, req.id);
	Logging.logSilly(`_configCrossDomain:domains ${domains}`, req.id);

	const domainIdx = domains.indexOf(origin);
	if (domainIdx === -1) {
		Logging.logError(new Error(`Invalid Domain: ${origin}`));
		res.sendStatus(403);
		Logging.logTimer('_configCrossDomain:end-invalid-domain', req.timer, Logging.Constants.LogLevel.SILLY, req.id);
		return;
	}

	res.header('Access-Control-Allow-Origin', req.header('Origin'));
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
	res.header('Access-Control-Allow-Headers', 'content-type');

	if (req.method === 'OPTIONS') {
		res.sendStatus(200);
		Logging.logTimer('_configCrossDomain:end-options-req', req.timer, Logging.Constants.LogLevel.SILLY, req.id);
		return;
	}

	Logging.logTimer('_configCrossDomain:end', req.timer, Logging.Constants.LogLevel.SILLY, req.id);
	next();
}

function logErrors(err, req, res, next) {
	if (err instanceof Helpers.RequestError) {
		res.status(err.code).json({statusMessage: err.message, message: err.message});
	} else {
		if (err) {
			Logging.logError(err, req.id);
		}
		res.status(500);
	}

	res.end();

	next(err);
}

/**
 * @param {Object} app - express app object
 * @param {Object} io - socket io object
 * @return {Promise} - resolves once the tokens have been pre-cached
 */
exports.init = (app) => {
	// Route.app = app;

	app.get('/favicon.ico', (req, res, next) => res.sendStatus(404));
	app.get(['/', '/index.html'], (req, res, next) => res.sendFile(path.join(__dirname, '../static/index.html')));

	const apiRouter = express.Router(); // eslint-disable-line new-cap

	apiRouter.use(_timeRequest);
	apiRouter.use(_authenticateToken);
	apiRouter.use(_configCrossDomain);

	return Model.App.findAll().toArray()
		.then((buttressApps) => {
		// Fetch app schemas and init
			buttressApps.forEach((buttressApp) => {
				if (buttressApp.__schema) {
					Schema.decode(buttressApp.__schema)
						.filter((s) => s.type === 'collection')
						.forEach((schema) => {
							_initSchemaRoutes(apiRouter, buttressApp, schema);
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
					_initRoute(apiRouter, route);
				}
			}
		})
		.then(() => _loadTokens())
		.then(() => {
			Logging.logSilly(`init:registered-routes`);
			app.use('', apiRouter);
			app.use(logErrors);
		});
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
