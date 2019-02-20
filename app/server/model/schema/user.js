'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file user.js
 * @description User model definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

const SchemaModel = require('../schemaModel');
const humanname = require('humanname');
const Model = require('../');
const Logging = require('../../logging');
// const Shared = require('../shared');
const ObjectId = require('mongodb').ObjectId;

const collectionName = 'users';
const collection = Model.mongoDb.collection(collectionName);

/**
 * Constants
*/
const apps = ['google', 'facebook', 'twitter', 'linkedin'];
const App = {
	GOOGLE: apps[0],
	FACEBOOK: apps[1],
	TWITTER: apps[2],
	LINKEDIN: apps[3],
};

class UserSchemaModel extends SchemaModel {
	constructor(MongoDb) {
		const schema = UserSchemaModel.Schema;
		super(MongoDb, schema);
	}

	static get Constants() {
		return {
			App: App,
		};
	}
	get Constants() {
		return UserSchemaModel.Constants;
	}

	static get Schema() {
		return {
			name: 'users',
			type: 'collection',
			collection: 'users',
			extends: [],
			properties: {
				auth: {
					__type: 'array',
					__required: true,
					__allowUpdate: true,
					__schema: {
						app: {
							__type: 'string',
							__default: '',
							__allowUpdate: true,
						},
						appId: {
							__type: 'string',
							__default: '',
							__allowUpdate: true,
						},
						username: {
							__type: 'string',
							__default: '',
							__allowUpdate: true,
						},
						profileUrl: {
							__type: 'string',
							__default: '',
							__allowUpdate: true,
						},
						images: {
							profile: {
								__type: 'string',
								__default: '',
								__allowUpdate: true,
							},
							banner: {
								__type: 'string',
								__default: '',
								__allowUpdate: true,
							},
						},
						email: {
							__type: 'string',
							__default: '',
							__allowUpdate: true,
						},
						locale: {
							__type: 'string',
							__default: '',
							__allowUpdate: true,
						},
						token: {
							__type: 'string',
							__default: '',
							__allowUpdate: true,
						},
						tokenSecret: {
							__type: 'string',
							__default: '',
							__allowUpdate: true,
						},
						refreshToken: {
							__type: 'string',
							__default: '',
							__allowUpdate: true,
						},
						extras: {
							__type: 'string',
							__default: '',
							__allowUpdate: true,
						},
					},
				},
				person: {
					title: {
						__type: 'string',
						__default: '',
						__allowUpdate: true,
					},
					formalName: {
						__type: 'string',
						__default: '',
						__allowUpdate: true,
					},
					name: {
						__type: 'string',
						__default: '',
						__allowUpdate: true,
					},
					forename: {
						__type: 'string',
						__default: '',
						__allowUpdate: true,
					},
					initials: {
						__type: 'string',
						__default: '',
						__allowUpdate: true,
					},
					surname: {
						__type: 'string',
						__default: '',
						__allowUpdate: true,
					},
					suffix: {
						__type: 'string',
						__default: '',
						__allowUpdate: true,
					},
					emails: {
						__type: 'array',
						__allowUpdate: true,
					},
					address: {
						__type: 'string',
						__default: '',
						__allowUpdate: true,
					},
					postcode: {
						__type: 'string',
						__default: '',
						__allowUpdate: true,
					},
					phone: {
						landline: {
							__type: 'string',
							__default: '',
							__allowUpdate: true,
						},
						mobile: {
							__type: 'string',
							__default: '',
							__allowUpdate: true,
						},
					},
					company: {
						__type: 'string',
						__default: '',
						__allowUpdate: true,
					},
					role: {
						__type: 'string',
						__default: '',
						__allowUpdate: true,
					},
					_dataOwner: {
						__type: 'id',
						__required: true,
						__allowUpdate: false,
					},
				},
				_apps: {
					__type: 'array',
					__required: true,
					__allowUpdate: true,
				},
				_tokens: {
					__type: 'array',
					__required: true,
					__allowUpdate: true,
				},
			},
		};
	}

	/**
	 * @param {Object} body - body passed through from a POST request
	 * @param {Object} auth - OPTIONAL authentication details for a user token
	 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
	 */
	add(body, auth) {
		const name = humanname.parse(body.name);

		const title = name.salutation ? name.salutation + ' ' : '';
		const initials = name.initials ? name.initials + ' ' : '';

		const user = {
			auth: [{
				app: body.app,
				appId: body.id,
				username: body.username,
				profileUrl: body.profileUrl,
				images: {
					profile: body.profileImgUrl,
					banner: body.bannerImgUrl,
				},
				email: body.email,
				token: body.token,
				tokenSecret: body.tokenSecret,
			}],
			person: {
				title: name.salutation,
				formalName: `${title}${name.firstName} ${initials}${name.lastName}`.trim(),
				name: `${name.firstName} ${name.lastName}`.trim(),
				forename: name.firstName,
				initials: name.initials,
				surname: name.lastName,
				suffix: name.suffix,
				emails: [body.email],
				telephone: {
					landline: body.landline,
					mobile: body.mobile,
				},
				address: body.address,
				postcode: body.postcode,
			}
		};

		let _user = null;
		return super.add(user, {
			_apps: [Model.authApp._id]
		})
			.then((user) => {
				_user = user;
				if (!auth) {
					return false;
				}

				auth.allocated = true;

				return Model.Token.add(auth, {
					_app: Model.authApp._id,
					_user: _user._id,
				});
			})
			.then((token) => {
				_user.authToken = false;

				if (token) {
					_user.authToken = token.value;
				}

				return _user;
			});
	}

	addAuth(auth) {
		Logging.log(`addAuth: ${auth.app}`, Logging.Constants.LogLevel.INFO);
		const existing = this.auth.find((a) => a.app === auth.app && a.id == auth.id); // eslint-disable-line eqeqeq
		if (existing) {
			Logging.log(`present: ${auth.app}:${auth.id}`, Logging.Constants.LogLevel.DEBUG);
			return Promise.resolve(this);
		}

		Logging.log(`not present: ${auth.app}:${auth.id}`, Logging.Constants.LogLevel.DEBUG);
		this.auth.push(new Model.Appauth({
			app: auth.app,
			appId: auth.id,
			username: auth.username,
			profileUrl: auth.profileUrl,
			images: {
				profile: auth.profileImgUrl,
				banner: auth.bannerImgUrl,
			},
			email: auth.email,
			token: auth.token,
			tokenSecret: auth.tokenSecret,
			refreshToken: auth.refreshToken,
		}));
		return this.save();
	}

	/**
	 * @param {object} user - user object of which the token is being updated
	 * @param {object} app - app object of which the token is being updated
	 * @param {Object} updated - updated app information passed through from a PUT request
	 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
	 */
	updateAppInfo(user, app, updated) {
		const authIdx = user.auth.findIndex((a) => a.app === app);
		if (authIdx === -1) {
			Logging.log(`Unable to find Appauth for ${app}`, Logging.Constants.LogLevel.DEBUG);
			return Promise.resolve(false);
		}

		const auth = user.auth[authIdx];
		auth.username = updated.username;
		auth.profileUrl = updated.profileUrl;
		auth.images.profile = updated.profileImgUrl;
		auth.images.banner = updated.bannerImgUrl;
		auth.email = updated.email;
		auth.token = updated.token;
		auth.tokenSecret = updated.tokenSecret;
		auth.refreshToken = updated.refreshToken;

		const update = {};
		update[`auth.${authIdx}`] = auth;
		return super.update(update, user._id).then(() => true);
	}

	updateApps(user, app) {
		Logging.log(`updateApps: ${Model.authApp._id}`, Logging.Constants.LogLevel.INFO);
		if (!user._apps) {
			user._apps = [];
		}
		const matches = user._apps.filter(function(a) {
			return a._id === app._id;
		});
		if (matches.length > 0) {
			Logging.log(`present: ${Model.authApp._id}`, Logging.Constants.LogLevel.DEBUG);
			return Promise.resolve();
		}

		Logging.log(`not present: ${Model.authApp._id}`, Logging.Constants.LogLevel.DEBUG);
		user._apps.push(app._id);

		return super.update({
			_apps: user._apps,
		}, user.id);
	}

	exists(id) {
		return collection.find({_id: new ObjectId(id)})
			.limit(1)
			.count()
			.then((count) => count > 0);
	}

	/**
	 * @param {ObjectId} appId - id of the App that owns the user
	 * @return {Promise} - resolves to an array of Apps
	 */
	findAll() {
		Logging.logSilly(`findAll: ${Model.authApp._id}`);

		return new Promise((resolve) => {
			let findTask = () => super.find({_apps: Model.authApp._id});
			if (Model.token.authLevel === Model.Token.Constants.AuthLevel.SUPER) {
				findTask = () => super.find({});
			}

			findTask()
				.then((users) => resolve(users));
		});
	}

	/**
	 * @param {string} username - username to check for
	 * @return {Promise} - resolves to a User object or null
	 */
	getByUsername(username) {
		return super.findOne({username: username}, {_id: 1});
	}

	/**
	 * @param {string} appName - Name of the authenticating App (facebook|twitter|google) that owns the user
	 * @param {string} appUserId - AppId of the user
	 * @return {Promise} - resolves to an array of Apps
	 */
	getByAppId(appName, appUserId) {
		Logging.log(`getByAppId: ${appName} - ${appUserId}`, Logging.Constants.LogLevel.VERBOSE);

		return super.findOne({
			'auth.app': appName,
			'auth.appId': appUserId,
		}, {});
	}

	// attachToPerson(person, details) {
	// 	if (person !== null) {
	// 		this._person = person;
	// 		return this.save();
	// 	}

	// 	return new Promise((resolve, reject) => {
	// 		Model.Person
	// 			.add(details, Model.authApp._id)
	// 			.then((person) => {
	// 				Logging.log(person, Logging.Constants.LogLevel.DEBUG);
	// 				this._person = person.id;
	// 				return this.save();
	// 			})
	// 			.then(resolve, reject);
	// 	});
	// }

	/**
	 * @param {string} app - name of the app for which the token is being updated
	 * @param {Object} body - body passed through from a PUT request
	 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
	 */
	updateToken(app, body) {
		const auth = this.auth.find((a) => a.app === app);
		if (!auth) {
			Logging.log(`Unable to find Appauth for ${app}`, Logging.Constants.LogLevel.DEBUG);
			return Promise.resolve(false);
		}

		Logging.log(`Old Token: ${auth.token}`, Logging.Constants.LogLevel.DEBUG);
		Logging.log(`Old Token Secret: ${auth.tokenSecret}`, Logging.Constants.LogLevel.DEBUG);
		Logging.log(`New Token: ${body.token}`, Logging.Constants.LogLevel.DEBUG);
		Logging.log(`New Token Secret: ${body.tokenSecret}`, Logging.Constants.LogLevel.DEBUG);

		auth.token = body.token;
		auth.tokenSecret = body.tokenSecret;

		return this.save().then(() => true);
	}
}

/**
 * Exports
 */
module.exports = UserSchemaModel;
