'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file helpers.js
 * @description Helpers
 * @module System
 * @author Chris Bates-Keegan
 *
 */

const stream = require('stream');
const Transform = stream.Transform;

class Timer {
	constructor() {
		this._start = 0;
	}

	start() {
		const hrTime = process.hrtime();
		this._last = this._start = (hrTime[0] * 1000000) + (hrTime[1] / 1000);
	}

	get lapTime() {
		const hrTime = process.hrtime();
		const time = (hrTime[0] * 1000000) + (hrTime[1] / 1000);
		const lapTime = time - this._last;
		this._last = time;
		return (lapTime / 1000000);
	}
	get interval() {
		const hrTime = process.hrtime();
		const time = (hrTime[0] * 1000000) + (hrTime[1] / 1000);
		return ((time - this._start) / 1000000);
	}
}

module.exports.Timer = Timer;

const __prepareResult = (result) => {
	const prepare = (chunk) => {
		if (!chunk) return chunk;

		if (chunk._id) {
			chunk.id = chunk._id;
			delete chunk._id;
		}
		if (chunk._app) {
			chunk.appId = chunk._app;
			delete chunk._app;
		}
		if (chunk._user) {
			chunk.userId = chunk._user;
			delete chunk._user;
		}

		if (typeof chunk === 'object') {
			Object.keys(chunk).forEach((key) => {
				if (key.indexOf('_') !== -1) {
					// return delete chunk[key];
				}

				chunk[key] = (Array.isArray(chunk[key])) ? chunk[key].map((c) => prepare(c)) : prepare(chunk[key]);
			});
		}

		return chunk;
	};

	return (Array.isArray(result)) ? result.map((c) => prepare(c)) : prepare(result);
};
module.exports.prepareResult = __prepareResult;
class JSONStringifyStream extends Transform {
	constructor(options, prepare) {
		super(Object.assign(options || {}, {objectMode: true}));

		this._first = true;
		this.prepare = prepare;
	}

	_transform(chunk, encoding, cb) {
		const nonReplacerKeys = [
			'_id', '_app', '__v', '_user', '_token',
		];

		const __replacer = (key, value) => {
			if (nonReplacerKeys.indexOf(key) !== -1) {
				return undefined;
			}
			if (key === 'metadata') {
				return value.reduce((metadata, entry) => {
					metadata[entry.key] = JSON.parse(entry.value);
					return metadata;
				}, {});
			}
			if (Array.isArray(value)) {
				return value.map((c) => {
					if (c && c._id) c.id = c._id;
					return c;
				});
			}

			return value;
		};

		if (this.prepare) {
			chunk = this.prepare(chunk);
		} else {
			chunk = __prepareResult(chunk, this.schema, this.token);
		}

		// Dont return any blank objects
		if (chunk === null || typeof chunk === 'object' && Object.keys(chunk).length < 1) {
			return cb();
		}

		const str = JSON.stringify(chunk, __replacer);

		if (this._first) {
			this._first = false;
			this.push(`[${str}`);
		} else {
			this.push(`,${str}`);
		}

		cb();
	}

	_flush(cb) {
		if (this._first) {
			this._first = false;
			this.push('[');
		}

		this.push(']');
		cb();
	}
}

module.exports.JSONStringifyStream = JSONStringifyStream;

module.exports.Promise = {
	prop: (prop) => ((val) => val[prop]),
	func: (func) => ((val) => val[func]()),
	nop: () => (() => null),
	inject: (value) => (() => value),
	arrayProp: (prop) => ((arr) => arr.map((a) => a[prop])),
};

module.exports.ShortId = (id) => {
	const toBase = (num, base) => {
		const symbols = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-'.split('');
		let decimal = num;
		let temp;
		let output = '';

		if (base > symbols.length || base <= 1) {
			throw new RangeError(`Radix must be less than ${symbols.length} and greater than 1`);
		}

		while (decimal > 0) {
			temp = Math.floor(decimal / base);
			output = symbols[(decimal - (base * temp))] + output;
			decimal = temp;
		}

		return output;
	};

	let output = '';

	const date = id.getTimestamp();
	let time = date.getTime();

	let counter = parseInt(id.toHexString().slice(-6), 16);
	counter = parseInt(counter.toString().slice(-3), 10);

	time = counter + time;
	output = toBase(time, 64);
	output = output.slice(3);

	return output;
};

const __flattenRoles = (data, path) => {
	if (!path) path = [];

	return data.roles.reduce((_roles, role) => {
		const _path = path.concat(`${role.name}`);
		if (role.roles && role.roles.length > 0) {
			return _roles.concat(__flattenRoles(role, _path));
		}

		const flatRole = Object.assign({}, role);
		flatRole.name = _path.join('.');
		_roles.push(flatRole);
		return _roles;
	}, []);
};
module.exports.flattenRoles = __flattenRoles;
