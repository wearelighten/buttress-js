'use strict'; // eslint-disable-line max-lines

/**
 * ButtressJS - Realtime datastore for software
 *
 * @file user.js
 * @description USER API specification
 * @module API
 * @author Chris Bates-Keegan
 *
 */

const Route = require('../route');
const Model = require('../../model');
const Logging = require('../../logging');
// const Helpers = require('../../helpers');
const ObjectId = require('mongodb').ObjectId;

const routes = [];

/**
 * @class GetUserList
 */
class GetUserList extends Route {
	constructor() {
		super('user', 'GET USER LIST');
		this.verb = Route.Constants.Verbs.GET;
		this.auth = Route.Constants.Auth.ADMIN;
		this.permissions = Route.Constants.Permissions.LIST;
	}

	_validate(req, res, token) {
		return Promise.resolve(true);
	}

	_exec(req, res, validate) {
		return Model.User.findAll(req.authApp._id, req.token.authLevel);
	}
}
routes.push(GetUserList);

/**
 * @class GetUser
 */
class GetUser extends Route {
	constructor() {
		super('user/:id', 'GET USER');
		this.verb = Route.Constants.Verbs.GET;
		this.auth = Route.Constants.Auth.ADMIN;
		this.permissions = Route.Constants.Permissions.READ;

		this._user = false;
	}

	_validate(req, res, token) {
		return new Promise((resolve, reject) => {
			if (!req.params.id || !ObjectId.isValid(req.params.id)) {
				this.log(`[${this.name}] Missing required field`, Route.LogLevel.ERR);
				reject({statusCode: 400});
				return;
			}

			Model.User.findById(req.params.id, req.authApp._id)
				.then((user) => {
					if (!user) {
						this.log('ERROR: Invalid User ID', Route.LogLevel.ERR);
						reject({statusCode: 400});
						return;
					}

					resolve(user);
				});
		});
	}

	_exec(req, res, user) {
		return user;
	}
}
routes.push(GetUser);

/**
 * @class FindUser
 */
class FindUser extends Route {
	constructor() {
		super('user/:app(twitter|facebook|google|app-*)/:id', 'FIND USER');
		this.verb = Route.Constants.Verbs.GET;
		this.auth = Route.Constants.Auth.ADMIN;
		this.permissions = Route.Constants.Permissions.READ;
	}

	_validate(req, res, token) {
		return new Promise((resolve, reject) => {
			Model.User.getByAppId(req.params.app, req.params.id)
				.then((_user) => {
					Logging.logSilly(`FindUser: ${_user !== null}`);
					if (_user) {
						Model.Token.findUserAuthTokens(_user._id, req.authApp._id)
							.then((tokens) => {
								const hasFoundToken = (tokens && tokens.lenght > 0);
								Logging.logSilly(`FindUserToken: ${hasFoundToken === true}`);

								resolve({
									id: _user._id,
									tokens: tokens.map((t) => {
										return {
											value: t.value,
											role: t.role,
										};
									}),
								});

								// Model.User.updateApps(_user, req.authApp)
								// 	.then(() => resolve({
								// 		id: _user._id,
								// 		tokens: _userAuthToken,
								// 	}), reject);
							});
					} else {
						resolve(false);
					}
				});
		});
	}

	_exec(req, res, validate) {
		return Promise.resolve(validate);
	}
}
routes.push(FindUser);

/**
 * @class CreateUserAuthToken
 */
class CreateUserAuthToken extends Route {
	constructor() {
		super('user/:id/token', 'CREATE USER AUTH TOKEN');
		this.verb = Route.Constants.Verbs.PUT;
		this.auth = Route.Constants.Auth.ADMIN;
		this.permissions = Route.Constants.Permissions.WRITE;
	}

	_validate(req, res, token) {
		return new Promise((resolve, reject) => {
			if (!req.body.auth ||
				!req.body.auth.authLevel ||
				!req.body.auth.permissions ||
				!req.body.auth.domains) {
				this.log(`[${this.name}] Missing required field`, Route.LogLevel.ERR);
				reject({statusCode: 400});
				return;
			}
			req.body.auth.type = Model.Token.Constants.Type.USER;
			req.body.auth.app = req.authApp;

			if (!req.params.id || !ObjectId.isValid(req.params.id)) {
				this.log(`[${this.name}] Missing required field`, Route.LogLevel.ERR);
				reject({statusCode: 400});
				return;
			}

			Model.User.findById(req.params.id, req.authApp._id)
				.then((user) => {
					Logging.log(`User: ${user ? user.id : null}`, Logging.Constants.LogLevel.DEBUG);
					if (user) {
						resolve(user);
					} else {
						this.log('ERROR: Invalid User ID', Route.LogLevel.ERR);
						resolve({statusCode: 400});
					}
				});
		});
	}

	_exec(req, res, user) {
		return Model.Token.add(req.body.auth, {
			_app: req.authApp._id,
			_user: user._id,
		})
			.then((t) => t.value);
	}
}
routes.push(CreateUserAuthToken);

/**
 * @class UpdateUserAppToken
 */
class UpdateUserAppToken extends Route {
	constructor() {
		super('user/:id/:app(twitter|facebook|google)/token', 'UPDATE USER APP TOKEN');
		this.verb = Route.Constants.Verbs.PUT;
		this.auth = Route.Constants.Auth.ADMIN;
		this.permissions = Route.Constants.Permissions.READ;

		this._user = false;
	}

	_validate(req, res, token) {
		return new Promise((resolve, reject) => {
			if (!req.body ||
				!req.body.token) {
				this.log(`[${this.name}] Missing required field`, Route.LogLevel.ERR);
				reject({statusCode: 400});
				return;
			}

			if (!req.params.id || !ObjectId.isValid(req.params.id)) {
				this.log(`[${this.name}] Missing required field`, Route.LogLevel.ERR);
				reject({statusCode: 400});
				return;
			}

			Model.User.findById(req.params.id, req.authApp._id)
				.then((user) => {
					Logging.log(`User: ${user ? user.id : null}`, Logging.Constants.LogLevel.DEBUG);
					this._user = user;
					if (this._user) {
						resolve(true);
					} else {
						this.log('ERROR: Invalid User ID', Route.LogLevel.ERR);
						resolve({statusCode: 400});
					}
				});
		});
	}

	_exec(req, res, validate) {
		return this._user.updateToken(req.params.app, req.body);
	}
}
routes.push(UpdateUserAppToken);

/**
 * @class AddUser
 */
class AddUser extends Route {
	constructor() {
		super('user/:app?', 'ADD USER');
		this.verb = Route.Constants.Verbs.POST;
		this.auth = Route.Constants.Auth.ADMIN;
		this.permissions = Route.Constants.Permissions.ADD;
	}

	_validate(req, res, token) {
		return new Promise((resolve, reject) => {
			Logging.log(req.body.user, Logging.Constants.LogLevel.DEBUG);
			const app = req.body.user.app ? req.body.user.app : req.params.app;

			if (!app ||
					!req.body.user.id ||
					!req.body.user.token ||
					!req.body.user.profileImgUrl) {
				this.log(`[${this.name}] Missing required field`, Route.LogLevel.ERR);
				reject({statusCode: 400});
				return;
			}

			if (req.body.auth) {
				this.log(req.body.auth);
				this.log('User Auth Token Reqested');
				if (!req.body.auth.authLevel ||
						!req.body.auth.permissions ||
						!req.body.auth.domains) {
					this.log(`[${this.name}] Missing required field`, Route.LogLevel.ERR);
					reject({statusCode: 400});
					return;
				}
				req.body.auth.type = Model.Token.Constants.Type.USER;
				req.body.auth.app = req.authApp.id;
			}

			resolve(true);
		});
	}

	_exec(req, res, validate) {
		return Model.User.add(req.body.user, req.body.auth)
			.then((user) => {
				return user;
			});
	}
}
routes.push(AddUser);

/**
 * @class UpdateUserAppInfo
 */
class UpdateUserAppInfo extends Route {
	constructor() {
		super('user/:id/:app(twitter|facebook|google)/info', 'UPDATE USER APP INFO');
		this.verb = Route.Constants.Verbs.PUT;
		this.auth = Route.Constants.Auth.ADMIN;
		this.permissions = Route.Constants.Permissions.WRITE;

		this._user = false;
	}

	_validate(req, res, token) {
		return new Promise((resolve, reject) => {
			if (!req.body ||
				!req.body.token) {
				this.log(`[${this.name}] Missing required field`, Route.LogLevel.ERR);
				reject({statusCode: 400});
				return;
			}

			if (!req.params.id || !ObjectId.isValid(req.params.id)) {
				this.log(`[${this.name}] Missing required field`, Route.LogLevel.ERR);
				reject({statusCode: 400});
				return;
			}

			Model.User.findById(req.params.id, req.authApp._id)
				.then((user) => {
					Logging.log(`User: ${user ? user.id : null}`, Logging.Constants.LogLevel.DEBUG);
					this._user = user;
					if (this._user) {
						resolve(true);
					} else {
						this.log('ERROR: Invalid User ID', Route.LogLevel.ERR);
						reject({statusCode: 400});
					}
				});
		});
	}

	_exec(req, res, validate) {
		return Model.User.updateAppInfo(this._user, req.params.app, req.body);
	}
}
routes.push(UpdateUserAppInfo);

/**
 * @class AddUserAuth
 */
class AddUserAuth extends Route {
	constructor() {
		super('user/:id/auth', 'ADD USER AUTH');
		this.verb = Route.Constants.Verbs.PUT;
		this.auth = Route.Constants.Auth.ADMIN;
		this.permissions = Route.Constants.Permissions.ADD;

		this._user = null;
	}

	_validate(req, res, token) {
		return new Promise((resolve, reject) => {
			Logging.log(req.body.auth, Logging.Constants.LogLevel.DEBUG);
			const auth = req.body.auth;

			if (!auth || !auth.app || !auth.id || !auth.profileImgUrl || !auth.token) {
				this.log(`[${this.name}] Missing required field`, Route.LogLevel.ERR);
				reject({statusCode: 400});
				return;
			}

			if (!req.params.id || !ObjectId.isValid(req.params.id)) {
				this.log(`[${this.name}] Missing required field`, Route.LogLevel.ERR);
				reject({statusCode: 400});
				return;
			}

			Model.User.findById(req.params.id, req.authApp._id)
				.then((user) => {
					Logging.log(`User: ${user ? user.id : null}`, Logging.Constants.LogLevel.DEBUG);
					this._user = user;
					if (this._user) {
						resolve(true);
					} else {
						this.log('ERROR: Invalid User ID', Route.LogLevel.ERR);
						resolve({statusCode: 400});
					}
				});
		});
	}

	_exec(req, res, validate) {
		return this._user
			.addAuth(req.body.auth)
			.then((user) => {
				const tasks = [
					Promise.resolve(user.details),
					Model.Token.findUserAuthTokens(this._user._id, req.authApp._id),
				];

				return Promise.all(tasks);
			})
			.then((res) => Object.assign(res[0], {authToken: res[1] ? res[1].value : false}));
	}
}
routes.push(AddUserAuth);

/**
 * @class UpdateUser
 */
class UpdateUser extends Route {
	constructor() {
		super('user/:id', 'UPDATE USER');
		this.verb = Route.Constants.Verbs.PUT;
		this.auth = Route.Constants.Auth.ADMIN;
		this.permissions = Route.Constants.Permissions.WRITE;

		this.activityVisibility = Model.Activity.Constants.Visibility.PRIVATE;
		this.activityBroadcast = true;
	}

	_validate(req, res, token) {
		return new Promise((resolve, reject) => {
			const validation = Model.User.validateUpdate(req.body);
			if (!validation.isValid) {
				if (validation.isPathValid === false) {
					this.log(`ERROR: Update path is invalid: ${validation.invalidPath}`, Route.LogLevel.ERR);
					reject({statusCode: 400, message: `USER: Update path is invalid: ${validation.invalidPath}`});
					return;
				}
				if (validation.isValueValid === false) {
					this.log(`ERROR: Update value is invalid: ${validation.invalidValue}`, Route.LogLevel.ERR);
					reject({statusCode: 400, message: `USER: Update value is invalid: ${validation.invalidValue}`});
					return;
				}
			}

			Model.User.exists(req.params.id)
				.then((exists) => {
					if (!exists) {
						this.log('ERROR: Invalid User ID', Route.LogLevel.ERR);
						reject({statusCode: 400});
						return;
					}
					resolve(true);
				});
		});
	}

	_exec(req, res, validate) {
		return Model.User.updateByPath(req.body, req.params.id);
	}
}
routes.push(UpdateUser);

/**
 * @class DeleteAllUsers
 */
class DeleteAllUsers extends Route {
	constructor() {
		super('user', 'DELETE ALL USERS');
		this.verb = Route.Constants.Verbs.DEL;
		this.auth = Route.Constants.Auth.SUPER;
		this.permissions = Route.Constants.Permissions.DELETE;
	}

	_validate(req, res, token) {
		return Promise.resolve(true);
	}

	_exec(req, res, validate) {
		return Model.User.rmAll().then(() => true);
	}
}
routes.push(DeleteAllUsers);

/**
 * @class DeleteUser
 */
class DeleteUser extends Route {
	constructor() {
		super('user/:id', 'DELETE USER');
		this.verb = Route.Constants.Verbs.DEL;
		this.auth = Route.Constants.Auth.ADMIN;
		this.permissions = Route.Constants.Permissions.DELETE;
		this._user = false;
	}

	_validate(req, res, token) {
		return new Promise((resolve, reject) => {
			if (!req.params.id || !ObjectId.isValid(req.params.id)) {
				this.log(`[${this.name}] Missing required field`, Route.LogLevel.ERR);
				reject({statusCode: 400});
				return;
			}
			Model.User.findById(req.params.id, req.authApp._id)
				.then((user) => {
					if (!user) {
						this.log('ERROR: Invalid User ID', Route.LogLevel.ERR);
						reject({statusCode: 400});
						return;
					}
					this._user = user;
					resolve(true);
				});
		});
	}

	_exec(req, res, validate) {
		return Model.User.rm(this._user).then(() => true);
	}
}
routes.push(DeleteUser);

/**
 * @type {*[]}
 */
module.exports = routes;
