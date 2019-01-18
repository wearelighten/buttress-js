'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file app.js
 * @description App model definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

const fs = require('fs');
const crypto = require('crypto');
const SchemaModel = require('../schemaModel');
const ObjectId = require('mongodb').ObjectId;
const Model = require('../');
const Logging = require('../../logging');
const Config = require('node-env-obj')('../');
const NRP = require('node-redis-pubsub');
const nrp = new NRP(Config.redis);

/**
 * Constants
*/
const type = ['server', 'ios', 'android', 'browser'];
const Type = {
	SERVER: type[0],
	IOS: type[1],
	ANDROID: type[2],
	BROWSER: type[3]
};

class AppSchemaModel extends SchemaModel {
	constructor(MongoDb) {
		let schema = AppSchemaModel.Schema;
		super(MongoDb, schema);
	}

	static get Constants() {
		return {
			Type: Type,
			PUBLIC_DIR: true
		};
	}
	get Constants() {
		return AppSchemaModel.Constants;
	}

	static get Schema() {
		return {
			name: "apps",
			type: "collection",
			collection: "apps",
			extends: [],
			properties: {
				name: {
					__type: "string",
					__default: "",
					__allowUpdate: true
				},
				visibility: {
					__type: "string",
					__default: "server",
					__enum: type,
					__allowUpdate: true
				},
				domain: {
					__type: "string",
					__default: "",
					__allowUpdate: true
				},
				_owner: {
					__type: "id",
					__required: true,
					__allowUpdate: false
				},
				_token: {
					__type: "id",
					__required: true,
					__allowUpdate: false
				},
				__schema: {
					__type: "array",
					__required: true,
					__allowUpdate: true
				}
			}
		};
	}

	/**
	 * @param {Object} body - body passed through from a POST request
	 * @return {Promise} - fulfilled with App Object when the database request is completed
	 */
	add(body) {
		const app = {
			id: new ObjectId(),
			name: body.name,
			type: body.type,
			authLevel: body.authLevel,
			permissions: body.permissions,
			domain: body.domain,
			_owner: body.ownerGroupId
		};
		let _token = null;

		return Model.Token.add({
			type: Model.Token.Constants.Type.APP,
			authLevel: body.authLevel,
			permissions: body.permissions
		}, {
			_app: app.id
		})
			.then(token => {
				_token = token;
				Logging.log(token.value);
				return super.add(app, {
					_token: token.id
				});
			})
			.then(app => {
				return Promise.resolve({app: app, token: _token});
			});
	}

	/**
	 * @param {ObjectId} appId - app id which needs to be updated
	 * @param {object} schema - schema object for the app
	 * @return {Promise} - resolves when save operation is completed, rejects if metadata already exists
	 */
	updateSchema(appId, schema) {
		this.__schema = schema;

		nrp.emit('app-metadata:changed', {appId: appId});

		return new Promise((resolve, reject) => {
			this.collection.update({_id: appId}, {$set: {__schema: schema}}, {}, (err, object) => {
				if (err) throw new Error(err);

				resolve(object);
			});
		});
	}

	/**
	 * @param {string} route - route for the permission
	 * @param {*} permission - permission to apply to the route
	 * @return {Promise} - resolves when save operation is completed, rejects if metadata already exists
	 */
	addOrUpdatePermission(route, permission) {
		Logging.log(route, Logging.Constants.LogLevel.DEBUG);
		Logging.log(permission, Logging.Constants.LogLevel.DEBUG);

		return new Promise((resolve, reject) => {
			this.getToken()
			.then(token => {
				if (!token) {
					return reject(new Error('No valid authentication token.'));
				}
				token.addOrUpdatePermission().then(resolve, reject);
			});
		});
	}

	/**
	 * @param {String} name - name of the data folder to create
	 * @param {Boolean} isPublic - true for /public (which is available via the static middleware) otherwise /private
	 * @return {String} - UID
	 */
	mkDataDir(name, isPublic) {
		var uid = this.getPublicUID();
		var baseName = `${Config.paths.appData}/${isPublic ? 'public' : 'private'}/${uid}`;

		return new Promise((resolve, reject) => {
			fs.mkdir(baseName, err => {
				if (err && err.code !== 'EEXIST') {
					reject(err);
					return;
				}
				var dirName = `${baseName}/${name}`;
				fs.mkdir(dirName, err => {
					if (err && err.code !== 'EEXIST') {
						reject(err);
						return;
					}
					resolve();
				});
			});
		});
	}

	/**
	 * @return {String} - UID
	 */
	getPublicUID() {
		return this.genPublicUID(this.name, this.tokenValue);
	}

	/**
	 * @return {Promise} - resolves to the token
	 */
	getToken() {
		return Model.Token.findOne({_id: this._token});
	}

	/**
	 * @param {String} name - name of application
	 * @param {String} tokenValue - application token
	 * @return {String} - UID
	 */
	genPublicUID(name, tokenValue) {
		var hash = crypto.createHash('sha512');
		// Logging.log(`Create UID From: ${this.name}.${this.tokenValue}`, Logging.Constants.LogLevel.DEBUG);
		hash.update(`${name}.${tokenValue}`);
		var bytes = hash.digest();

		var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		var mask = 0x3d;
		var uid = '';

		for (var byte = 0; byte < 32; byte++) {
			uid += chars[bytes[byte] & mask];
		}

		Logging.log(`Got UID: ${uid}`, Logging.Constants.LogLevel.SILLY);
		return uid;
	}

}
/**
 * Schema Virtual Methods
 */
// schema.virtual('details').get(function() {
//   return {
//     id: this._id,
//     name: this.name,
//     type: this.type,
//     token: this.tokenValue,
//     owner: this.ownerDetails,
//     publicUid: this.getPublicUID(),
//     metadata: this.metadata.map(m => ({key: m.key, value: JSON.parse(m.value)}))
//   };
// });

/**
 * Exports
 */
module.exports = AppSchemaModel;
