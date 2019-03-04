'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file activity.js
 * @description Activity model definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

const SchemaModel = require('../schemaModel');
// const ObjectId = require('mongodb').ObjectId;
const Model = require('../');
const Logging = require('../../logging');
// const Shared = require('../shared');
// const Sugar = require('sugar');

/**
 * Constants
 */
const type = ['interaction', 'error', 'logging'];
const Type = {
	INTERACTION: type[0],
	ERROR: type[1],
	LOGGING: type[2],
};

class TrackingSchemaModel extends SchemaModel {
	constructor(MongoDb) {
		const schema = TrackingSchemaModel.Schema;
		super(MongoDb, schema);
	}

	static get Constants() {
		return {
			Type: Type,
		};
	}
	get Constants() {
		return TrackingSchemaModel.Constants;
	}

	static get Schema() {
		return {
			name: 'trackings',
			type: 'collection',
			collection: 'trackings',
			extends: [],
			properties: {
				timestamp: {
					__type: 'date',
					__default: 'now',
					__allowUpdate: false,
				},
				userId: {
					__type: 'id',
					__required: true,
					__allowUpdate: false,
				},
				name: {
					__type: 'string',
					__default: '',
					__allowUpdate: true,
				},
				type: {
					__type: 'string',
					__default: 'logging',
					__enum: type,
					__allowUpdate: true,
				},
				interaction: {
					type: {
						__type: 'string',
						__default: '',
						__allowUpdate: true,
					},
					location: {
						__type: 'string',
						__default: '',
						__allowUpdate: true,
					},
					context: {
						__type: 'string',
						__default: '',
						__allowUpdate: true,
					},
				},
				error: {
					message: {
						__type: 'string',
						__default: '',
						__allowUpdate: true,
					},
					url: {
						__type: 'string',
						__default: '',
						__allowUpdate: true,
					},
					line: {
						__type: 'string',
						__default: '',
						__allowUpdate: true,
					},
					col: {
						__type: 'string',
						__default: '',
						__allowUpdate: true,
					},
				},
				logging: {
					level: {
						__type: 'string',
						__default: '',
						__allowUpdate: true,
					},
				},
				environment: {
					browser: {
						__type: 'string',
						__default: '',
						__allowUpdate: true,
					},
					os: {
						__type: 'string',
						__default: '',
						__allowUpdate: true,
					},
					resolution: {
						__type: 'string',
						__default: '',
						__allowUpdate: true,
					},
					dpi: {
						__type: 'string',
						__default: '',
						__allowUpdate: true,
					},
					ram: {
						__type: 'string',
						__default: '',
						__allowUpdate: true,
					},
				},
				_app: {
					__type: 'id',
					__required: true,
					__allowUpdate: false,
				},
			},
		};
	}

	/**
	 * @param {Object} body - body passed through from a POST request to be validated
	 * @return {Object} - returns an object with validation context
	 */
	__doValidation(body) {
		const res = {
			isValid: true,
			missing: [],
			invalid: [],
		};

		if (!body.name) {
			res.isValid = false;
			res.missing.push('name');
		}
		if (!body.type) {
			res.isValid = false;
			res.missing.push('type');
		}

		return res;
	}

	validate(body) {
		if (body instanceof Array === false) {
			body = [body];
		}
		const validation = body.map(this.__doValidation).filter((v) => v.isValid === false);

		return validation.length >= 1 ? validation[0] : {isValid: true};
	}

	/**
	 * @return {Promise} - resolves to an array of Apps
	 */
	findAll() {
		Logging.log(`findAll: ${Model.authApp._id}`, Logging.Constants.LogLevel.DEBUG);

		if (Model.token.authLevel === Model.Token.Constants.AuthLevel.SUPER) {
			return this.collection.find({});
		}

		return this.collection.find({_app: Model.authApp._id});
	}
}

/* ********************************************************************************
*
* EXPORTS
*
**********************************************************************************/
module.exports = TrackingSchemaModel;
