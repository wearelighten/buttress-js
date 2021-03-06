'use strict';

/**
 * ButtressJS - Realtime datastore for software
 *
 * @file schema.js
 * @description Helpers
 * @module System
 * @author Lighten
 *
 */

const crypto = require('crypto');
const Helpers = require('./helpers');

class Schema {
	constructor(data) {
		this.data = data;

		this.name = data.name;

		this.digest = null;

		this.__flattened = null;
		this.__flattenedPermissionProperties = null;

		this.init();
	}

	init() {
		if (this.data) {
			const hash = crypto.createHash('sha1');
			hash.update(Schema.encode(this.data));
			this.digest = hash.digest('hex');

			this.__flattened = Helpers.getFlattenedSchema(this.data);
		}
	}

	getFlat() {
		return this.__flattened;
	}

	getFlatPermissionProperties() {
		if (this.__flattenedPermissionProperties) {
			return this.__flattenedPermissionProperties;
		}

		const properties = this.getFlat();
		const permissions = {};

		for (const property in properties) {
			if ({}.hasOwnProperty.call(properties, property)) {
				if (properties[property].__permissions) {
					permissions[property] = properties[property].__permissions;
				}
			}
		}

		this.__flattenedPermissionProperties = permissions;
		return permissions;
	}

	static encode(obj) {
		return JSON.stringify(obj);
		// return JSON.parse(Schema.encodeKey(JSON.stringify(obj)));
	}

	static decode(obj) {
		return JSON.parse(obj);
		// return JSON.parse(Schema.decodeKey(JSON.stringify(obj)));
	}

	static encodeKey(key) {
		return key.replace(/\\/g, '\\\\').replace(/\$/g, '\\u0024').replace(/\./g, '\\u002e');
	}

	static decodeKey(key) {
		return key.replace(/\\u002e/g, '.').replace(/\\u0024/g, '$').replace(/\\\\/g, '\\');
	}

	static buildCollections(schemas) {
		return Schema.build(schemas).filter((s) => s.type === 'collection');
	}

	static build(schemas) {
		return schemas.map((schema) => Schema.extend(schemas, schema));
	}

	static extend(schemas, schema) {
		if (schema.extends) {
			schema.extends.forEach((dependencyName) => {
				const dependencyIdx = schemas.findIndex((s) => s.name === dependencyName);
				if (dependencyIdx === -1) throw new Error(`Schema dependency ${dependencyName} for ${schema.name} missing.`);
				const dependency = Schema.extend(schemas, schemas[dependencyIdx]);
				if (!dependency.properties) return; // Skip if dependency has no properties
				schema.properties = Object.assign(schema.properties, dependency.properties);
			});
		}

		return schema;
	}
}
module.exports = Schema;

