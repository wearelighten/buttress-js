'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file schema.js
 * @description Helpers
 * @module System
 * @author Lighten
 *
 */

class Schema {
	constructor(schema) {
		this.schema = schema;
	}

	static encode(obj) {
		return JSON.parse(Schema.encodeKey(JSON.stringify(obj)));
	}

	static decode(obj) {
		return JSON.parse(Schema.decodeKey(JSON.stringify(obj)));
	}

	static encodeKey(key) {
		return key.replace('\\', '\\\\').replace('\$', '\\u0024').replace('.', '\\u002e');
	}

	static decodeKey(key) {
		return key.replace('\\u002e', '.').replace('\\u0024', '\$').replace('\\\\', '\\');
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

