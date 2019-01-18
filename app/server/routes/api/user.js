'use strict'; // eslint-disable-line max-lines

/**
 * ButtressJS - Realtime datastore for business software
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
const Helpers = require('../../helpers');
const ObjectId = require('mongodb').ObjectId;

let routes = [];

/**
 * @class GetUserList
 */
class GetUserList extends Route {
	constructor() {
		super('user', 'GET USER LIST');
		this.verb = Route.Constants.Verbs.GET;
		this.auth = Route.Constants.Auth.USER;
		this.permissions = Route.Constants.Permissions.LIST;
	}

	_validate() {
		return Promise.resolve(true);
	}

	_exec() {
		return Model.User.findAll()
			.then(users => {
				if (this.req.token.authLevel >= Route.Constants.Auth.ADMIN) {
					return users.map(user => {
						user.profiles = user.auth.map(a => ({
							app: a.app,
							username: a.username,
							email: a.email,
							url: a.profileUrl,
							image: a.images.profile
						}));
						return user;
					});
				}

				return users.map(user => {
					return {
						id: user._id,
						profiles: user.auth.map(a => ({
							app: a.app,
							username: a.username,
							email: a.email,
							url: a.profileUrl,
							image: a.images.profile
						})),
						formalName: user.person.formalName,
						name: user.person.name
					};
				});
			});
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

	_validate() {
		return new Promise((resolve, reject) => {
			if (!this.req.params.id || !ObjectId.isValid(this.req.params.id)) {
				this.log(`[${this.name}] Missing required field`, Route.LogLevel.ERR);
				reject({statusCode: 400});
				return;
			}
			Model.User.findById(this.req.params.id).then(user => {
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

	_exec() {
		return Model.User.getPopulated(this._user);
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

	_validate(authToken) {
		return new Promise((resolve, reject) => {
			Model.User.getByAppId(this.req.params.app, this.req.params.id)
				.then(_user => {
					Logging.logSilly(`FindUser: ${_user !== null}`);
					if (_user) {
						Model.Token.findUserAuthToken(_user._id, this.req.authApp._id)
							.then(token => {
								Logging.logSilly(`FindUserToken: ${token !== null}`);
								const _userAuthToken = token ? token.value : false;
								Model.User.updateApps(_user, this.req.authApp)
									.then(() => resolve({
										user: _user,
										userAuthToken: _userAuthToken
									}), reject);
							});
					} else {
						resolve(false);
					}
				});
		});
	}

	_exec(validate) {
		if (!validate) {
			return Promise.resolve(false);
		}

		return Promise.resolve({
			id: validate.user._id,
			authToken: validate.userAuthToken
		});
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

		this._user = false;
	}

	_validate() {
		return new Promise((resolve, reject) => {
			if (!this.req.body.auth ||
				!this.req.body.auth.authLevel ||
				!this.req.body.auth.permissions ||
				!this.req.body.auth.domains) {
				this.log(`[${this.name}] Missing required field`, Route.LogLevel.ERR);
				reject({statusCode: 400});
				return;
			}
			this.req.body.auth.type = Model.Token.Constants.Type.USER;
			this.req.body.auth.app = this.req.authApp;

			if (!this.req.params.id || !ObjectId.isValid(this.req.params.id)) {
				this.log(`[${this.name}] Missing required field`, Route.LogLevel.ERR);
				reject({statusCode: 400});
				return;
			}

			Model.User.findById(this.req.params.id)
				.then(user => {
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

	_exec() {
		return Model.Token.add(this.req.body.auth, {
			_app: Model.authApp._id,
			_user: this._user._id
		})
			.then(t => t.value);
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

	_validate() {
		return new Promise((resolve, reject) => {
			if (!this.req.body ||
				!this.req.body.token) {
				this.log(`[${this.name}] Missing required field`, Route.LogLevel.ERR);
				reject({statusCode: 400});
				return;
			}

			if (!this.req.params.id || !ObjectId.isValid(this.req.params.id)) {
				this.log(`[${this.name}] Missing required field`, Route.LogLevel.ERR);
				reject({statusCode: 400});
				return;
			}

			Model.User.findById(this.req.params.id).then(user => {
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

	_exec() {
		return this._user.updateToken(this.req.params.app, this.req.body);
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

	_validate() {
		return new Promise((resolve, reject) => {
			Logging.log(this.req.body.user, Logging.Constants.LogLevel.DEBUG);
			var app = this.req.body.user.app ? this.req.body.user.app : this.req.params.app;

			if (!app ||
					!this.req.body.user.id ||
					!this.req.body.user.token ||
					!this.req.body.user.profileImgUrl) {
				this.log(`[${this.name}] Missing required field`, Route.LogLevel.ERR);
				reject({statusCode: 400});
				return;
			}

			if (this.req.body.auth) {
				this.log(this.req.body.auth);
				this.log('User Auth Token Reqested');
				if (!this.req.body.auth.authLevel ||
						!this.req.body.auth.permissions ||
						!this.req.body.auth.domains) {
					this.log(`[${this.name}] Missing required field`, Route.LogLevel.ERR);
					reject({statusCode: 400});
					return;
				}
				this.req.body.auth.type = Model.Token.Constants.Type.USER;
				this.req.body.auth.app = this.req.authApp.id;
			}

			Model.Person.findByDetails(this.req.body.user)
				.then(person => {
					Logging.logDebug(`Found Person: ${person !== null}`);
					if (person === null) {
						Model.Person.add(this.req.body.user, this.req.authApp)
							.then(p => {
								Logging.log(p, Logging.Constants.LogLevel.SILLY);
								this._person = p;
								resolve(true);
							});
					} else {
						this._person = person;
						resolve(true);
					}
				}, reject);
		});
	}

	_exec() {
		return Model.User
			.add(this.req.body.user, this._person, this.req.body.auth)
			.then(user => {
				user.person = this._person;
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

	_validate() {
		return new Promise((resolve, reject) => {
			if (!this.req.body ||
				!this.req.body.token) {
				this.log(`[${this.name}] Missing required field`, Route.LogLevel.ERR);
				reject({statusCode: 400});
				return;
			}

			if (!this.req.params.id || !ObjectId.isValid(this.req.params.id)) {
				this.log(`[${this.name}] Missing required field`, Route.LogLevel.ERR);
				reject({statusCode: 400});
				return;
			}

			Model.User.findById(this.req.params.id).then(user => {
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

	_exec() {
		return Model.User.updateAppInfo(this._user, this.req.params.app, this.req.body);
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

	_validate() {
		return new Promise((resolve, reject) => {
			Logging.log(this.req.body.auth, Logging.Constants.LogLevel.DEBUG);
			let auth = this.req.body.auth;

			if (!auth || !auth.app || !auth.id || !auth.profileImgUrl || !auth.token) {
				this.log(`[${this.name}] Missing required field`, Route.LogLevel.ERR);
				reject({statusCode: 400});
				return;
			}

			if (!this.req.params.id || !ObjectId.isValid(this.req.params.id)) {
				this.log(`[${this.name}] Missing required field`, Route.LogLevel.ERR);
				reject({statusCode: 400});
				return;
			}

			Model.User.findById(this.req.params.id).then(user => {
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

	_exec() {
		return this._user
			.addAuth(this.req.body.auth)
			.then(user => {
				let tasks = [
					Promise.resolve(user.details),
					Model.Token.findUserAuthToken(this._user._id, this.req.authApp._id)
				];

				if (this._user._person) {
					tasks.push(this._user._person.updateFromAuth(this.req.body.auth));
				}

				return Promise.all(tasks);
			})
			.then(res => Object.assign(res[0], {authToken: res[1] ? res[1].value : false}));
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

	_validate() {
		return new Promise((resolve, reject) => {
			let validation = Model.User.validateUpdate(this.req.body);
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

			Model.User.exists(this.req.params.id)
				.then(exists => {
					if (!exists) {
						this.log('ERROR: Invalid User ID', Route.LogLevel.ERR);
						reject({statusCode: 400});
						return;
					}
					resolve(true);
				});
		});
	}

	_exec() {
		return Model.User.updateByPath(this.req.body, this.req.params.id);
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

	_validate() {
		return Promise.resolve(true);
	}

	_exec() {
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

	_validate() {
		return new Promise((resolve, reject) => {
			if (!this.req.params.id || !ObjectId.isValid(this.req.params.id)) {
				this.log(`[${this.name}] Missing required field`, Route.LogLevel.ERR);
				reject({statusCode: 400});
				return;
			}
			Model.User.findById(this.req.params.id).then(user => {
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

	_exec() {
		return Model.User.rm(this._user).then(() => true);
	}
}
routes.push(DeleteUser);

class AttachToPerson extends Route {
	constructor() {
		super('user/:id/person', 'ATTACH USER TO PERSON');
		this.verb = Route.Constants.Verbs.PUT;
		this.auth = Route.Constants.Auth.ADMIN;
		this.permissions = Route.Constants.Permissions.ADD;

		this._user = false;
		this._person = false;
	}

	_validate() {
		return new Promise((resolve, reject) => {
			if (!this.req.params.id || !ObjectId.isValid(this.req.params.id)) {
				this.log(`[${this.name}] Missing required field`, Route.LogLevel.ERR);
				reject({statusCode: 400});
				return;
			}

			Model.User
				.findById(this.req.params.id).then(user => {
					if (!user) {
						this.log('ERROR: Invalid User ID', Route.LogLevel.ERR);
						reject({statusCode: 400});
						return;
					}
					this._user = user;

					if (this._user._person) {
						this.log('ERROR: Already attached to a person', Route.LogLevel.ERR);
						reject({statusCode: 400});
						return;
					}

					if (!this.req.body.name || !this.req.body.email) {
						this.log(`[${this.name}] Missing required field`, Route.LogLevel.ERR);
						reject({statusCode: 400});
						return;
					}

					Model.Person
						.findByDetails(this.req.body)
						.then(person => {
							this._person = person;
							if (person) {
								return Model.User.findOne({_person: person});
							}
							return Promise.resolve(null);
						})
						.then(user => {
							if (user && user._id !== this._user._id) {
								this.log('ERROR: Person attached to a different user', Route.LogLevel.ERR);
								reject({statusCode: 400});
								return;
							}
							resolve(true);
						})
						.catch(err => {
							this.log(`ERROR: ${err.message}`, Route.LogLevel.ERR);
							reject({statusCode: 400});
						});
				})
				.catch(Logging.Promise.logError());
		});
	}

	_exec() {
		return this._user.attachToPerson(this._person, this.req.body)
			.then(Helpers.Promise.prop('details'));
	}
}
routes.push(AttachToPerson);

/**
 * @type {*[]}
 */
module.exports = routes;
