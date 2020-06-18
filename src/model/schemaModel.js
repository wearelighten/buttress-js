'use strict';

/**
 * ButtressJS - Realtime datastore for software
 *
 * @file schemaModel.js
 * @description A default model for schemas
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

const ObjectId = require('mongodb').ObjectId;
const Logging = require('../logging');
const Shared = require('./shared');
const Sugar = require('sugar');
// const Helpers = require('../helpers');
const shortId = require('../helpers').ShortId;

/* ********************************************************************************
 *
 * LOCALS
 *
 **********************************************************************************/

class SchemaModel {
	constructor(MongoDb, schemaData, app) {
		this.schemaData = schemaData;
		this.app = app || null;

		this.appShortId = (app) ? shortId(app._id) : null;
		this.collectionName = `${schemaData.collection}`;

		if (this.appShortId) {
			this.collectionName = `${this.appShortId}-${this.collectionName}`;
		}

		this.collection = MongoDb.collection(this.collectionName);
	}

	__doValidation(body) {
		const res = {
			isValid: true,
			missing: [],
			invalid: [],
		};

		const app = Shared.validateAppProperties(this.schemaData, body);
		if (app.isValid === false) {
			res.isValid = false;
			res.invalid = res.invalid.concat(app.invalid);
			res.missing = res.missing.concat(app.missing);
		}

		return res;
	}
	validate(body) {
		if (body instanceof Array === false) {
			body = [body];
		}
		const validation = body.map((b) => this.__doValidation(b)).filter((v) => v.isValid === false);

		return validation.length >= 1 ? validation[0] : {isValid: true};
	}

	static parseQuery(query, envFlat = {}, output = {}) {
		for (const property in query) {
			if (!query.hasOwnProperty(property)) continue;
			const command = query[property];

			if (property === '$or' && Array.isArray(command)) {
				output['$or'] = command.map((q) => SchemaModel.parseQuery(q, envFlat, {}));
			} else if (property === '$and' && Array.isArray(command)) {
				output['$and'] = command.map((q) => SchemaModel.parseQuery(q, envFlat, {}));
			} else {
				for (const operator in command) {
					if (!command.hasOwnProperty(operator)) continue;
					let operand = command[operator];

					// Check to see if operand is a path and fetch value
					if (operand.indexOf && operand.indexOf('.') !== -1) {
						let path = operand.split('.');
						const key = path.shift();

						path = path.join('.');

						if (key === 'env' && envFlat[path]) {
							operand = envFlat[path];
						} else {
							throw new Error(`Unable to find ${path} in schema.authFilter.env`);
						}
					}

					if (!output[property]) {
						output[property] = {};
					}
					output[property][`$${operator}`] = operand;
				}
			}
		}

		return output;
	}

	generateRoleFilterQuery(token, roles, Model) {
		if (!roles.schema || !roles.schema.authFilter) {
			return Promise.resolve({});
		}

		// Parse schema authFilter.env object, gather information that's needed.
		const buildEnv = (authFilter) => {
			const env = {
				authUserId: token._user,
			};

			const tasks = [];

			if (authFilter.env) {
				for (const property in roles.schema.authFilter.env) {
					if (!roles.schema.authFilter.env.hasOwnProperty(property)) continue;
					const query = roles.schema.authFilter.env[property];

					let propertyMap = '_id';
					if (query.map) {
						propertyMap = query.map;
					}
					for (const command in query) {
						if (!query.hasOwnProperty(command)) continue;

						if (command.includes('schema.')) {
							const commandPath = command.split('.');
							commandPath.shift(); // Remove "schema"
							const collectionName = `${this.appShortId}-${commandPath.shift()}`;
							const propertyPath = commandPath.join('.');

							let propertyQuery = {};
							propertyQuery[propertyPath] = query[command];
							propertyQuery = SchemaModel.parseQuery(propertyQuery, env, {});

							const fields = {};
							fields[propertyPath] = true;

							tasks.push(() => {
								return Model[collectionName].find(propertyQuery, fields)
									.then((res) => {
										// Map fetched properties into a array.
										env[property] = res.map((i) => i[propertyMap]);
										// Hack - Flattern any sub arrays down to the single level.
										env[property] = [].concat.apply([], env[property]);
									});
							});
						} else {
							// Unknown operation
						}
					}
				}
			}

			// The env process may need to query other collections so group them into tasks.
			return tasks.reduce((prev, task) => prev.then(() => task()), Promise.resolve())
				.then(() => env);
		};

		// Build the query structure with the built env object applyed to it.
		const buildQuery = (schemaQuery, env) => {
			return new Promise((resolve) => {
				const query = (schemaQuery) ? schemaQuery : {};

				resolve(SchemaModel.parseQuery(query, env, {}));
			});
		};

		// Engage.
		return buildEnv(roles.schema.authFilter)
			.then((env) => buildQuery(roles.schema.authFilter.query, env));
	}

	/*
	* @param {Object} body - body passed through from a POST request
	* @return {Promise} - returns a promise that is fulfilled when the database request is completed
	*/
	__add(body, internals) {
		return (prev) => {
			const entity = Object.assign({}, internals);

			if (body.id) {
				entity._id = new ObjectId(body.id);
			}

			if (this.schemaData.extends && this.schemaData.extends.includes('timestamps')) {
				entity.createdAt = Sugar.Date.create();
				entity.updatedAt = (body.updatedAt) ? Sugar.Date.create(body.updatedAt) : null;
			}

			const validated = Shared.applyAppProperties(this.schemaData, body);
			return prev.concat([Object.assign(validated, entity)]);
		};
	}
	add(body, internals) {
		const sharedAddFn = Shared.add(this.collection, (item) => this.__add(item, internals));
		return sharedAddFn(body);
	}

	update(query, id) {
		Logging.logSilly(`update: ${this.collectionName} ${id} ${query}`);

		return new Promise((resolve, reject) => {
			this.collection.updateOne({_id: id}, {
				$set: query,
			}, (err, object) => {
				if (err) throw new Error(err);

				resolve(object);
			});
		});
	}
	validateUpdate(body) {
		const sharedFn = Shared.validateUpdate({}, this.schemaData);
		return sharedFn(body);
	}
	updateByPath(body, id) {
		const sharedFn = Shared.updateByPath({}, this.schemaData, this.collection);

		if (body instanceof Array === false) {
			body = [body];
		}

		if (this.schemaData.extends && this.schemaData.extends.includes('timestamps')) {
			body.push({
				path: 'updatedAt',
				value: new Date(),
				contextPath: '^updatedAt$',
			});
		}

		return sharedFn(body, id);
	}

	exists(id) {
		Logging.logSilly(`exists: ${this.collectionName} ${id}`);

		return this.collection.find({_id: new ObjectId(id)})
			.limit(1)
			.count()
			.then((count) => count > 0);
	}

	/*
	* @return {Promise} - returns a promise that is fulfilled when the database request is completed
	*/
	isDuplicate(details) {
		return Promise.resolve(false);
	}

	/**
	 * @param {App} entity - entity object to be deleted
	 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
	 */
	rm(entity) {
		Logging.log(`DELETING: ${entity._id}`, Logging.Constants.LogLevel.DEBUG);
		return new Promise((resolve) => {
			this.collection.deleteOne({_id: new ObjectId(entity._id)}, (err, cursor) => {
				if (err) throw err;
				resolve(cursor);
			});
		});
	}

	/**
	 * @param {Array} ids - Array of entity ids to delete
	 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
	 */
	rmBulk(ids) {
		Logging.log(`rmBulk: ${this.collectionName} ${ids}`, Logging.Constants.LogLevel.SILLY);
		return this.rmAll({_id: {$in: ids}});
	}

	/*
	 * @param {Object} query - mongoDB query
	 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
	 */
	rmAll(query) {
		if (!query) query = {};
		Logging.logSilly(`rmAll: ${this.collectionName} ${query}`);

		return new Promise((resolve) => {
			this.collection.deleteMany(query, (err, doc) => {
				if (err) throw err;
				resolve(doc);
			});
		});
	}

	/**
	 * @param {String} id - entity id to get
	 * @return {Promise} - resolves to an array of Companies
	 */
	findById(id) {
		Logging.logSilly(`findById: ${this.collectionName} ${id}`);

		return new Promise((resolve) => {
			this.collection.findOne({_id: new ObjectId(id)}, {}, (err, doc) => {
				if (err) throw err;
				resolve(doc);
			});
		});
	}

	/**
	 * @param {Object} query - mongoDB query
	 * @param {Object} excludes - mongoDB query excludes
	 * @param {Boolean} stream - should return a stream
	 * @return {Promise} - resolves to an array of docs
	 */
	find(query, excludes = {}, stream = false) {
		Logging.logSilly(`find: ${this.collectionName} ${query}`);

		if (stream) {
			return this.collection.find(query, excludes);
		}

		return new Promise((resolve) => {
			this.collection.find(query, excludes).toArray((err, doc) => {
				if (err) throw err;
				resolve(doc);
			});
		});
	}

	/**
	 * @param {Object} query - mongoDB query
	 * @param {Object} excludes - mongoDB query excludes
	 * @return {Promise} - resolves to an array of docs
	 */
	findOne(query, excludes = {}) {
		Logging.logSilly(`findOne: ${this.collectionName} ${query}`);

		return new Promise((resolve) => {
			this.collection.find(query, excludes).toArray((err, doc) => {
				if (err) throw err;
				resolve(doc[0]);
			});
		});
	}

	/**
	 * @return {Promise} - resolves to an array of Companies
	 */
	findAll() {
		Logging.logSilly(`findAll: ${this.collectionName}`);

		return this.collection.find({});
	}

	/**
	 * @param {Array} ids - Array of entities ids to get
	 * @return {Promise} - resolves to an array of Companies
	 */
	findAllById(ids) {
		Logging.logSilly(`update: ${this.collectionName} ${ids}`);

		return this.collection.find({_id: {$in: ids.map((id) => new ObjectId(id))}}, {});
	}
}

module.exports = SchemaModel;
