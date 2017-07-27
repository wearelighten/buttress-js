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
    let hrTime = process.hrtime();
    this._last = this._start = (hrTime[0] * 1000000) + (hrTime[1] / 1000);
  }

  get lapTime() {
    let hrTime = process.hrtime();
    let time = (hrTime[0] * 1000000) + (hrTime[1] / 1000);
    let lapTime = time - this._last;
    this._last = time;
    return (lapTime / 1000000);
  }
  get interval() {
    let hrTime = process.hrtime();
    let time = (hrTime[0] * 1000000) + (hrTime[1] / 1000);
    return ((time - this._start) / 1000000);
  }
}

module.exports.Timer = Timer;

class JSONStringifyStream extends Transform {
  constructor(options) {
    super(Object.assign(options || {}, {objectMode: true}));
    this._first = true;
  }

  _transform(chunk, encoding, cb) {
    const __replacer = (key, value) => {
      if (key === '_id' || key === '_app' || key === '__v') {
        return undefined;
      }
      if (key === 'metadata') {
        return key.reduce((metadata, entry) => {
          metadata[entry.key] = JSON.parse(entry.value);
          return metadata;
        }, {});
      }
      if (value instanceof Array) {
        return value.map(c => {
          if (c._id) c.id = c._id;
          return c;
        });
      }

      return value;
    };

    if (chunk._id) {
      chunk.id = chunk._id;
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
  prop: prop => (val => val[prop]),
  func: func => (val => val[func]()),
  nop: () => (() => null),
  inject: value => (() => value),
  arrayProp: prop => (arr => arr.map(a => a[prop]))
};

