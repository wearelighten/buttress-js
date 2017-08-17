'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file shared.js
 * @description Shared schema functions.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

const Logging = require('../logging');
const Model = require('./index');

/* ********************************************************************************
 *
 * APP-SPECIFIC SCHEMA
 *
 **********************************************************************************/

const __schema = {};
const __values = {};

const _validateAppProperties = function(collection, body) {
  const res = {
    isValid: true,
    invalid: [],
    missing: []
  };

  if (!Model.authApp.schema) {
    Logging.logSilly(`App property validation: no registered schema for ${Model.authApp.id}`);
    return res;
  }
  const appSchema = Model.authApp.__schema;
  const schema = appSchema.find(r => r.collection === collection);
  if (!schema) {
    Logging.logSilly(`App property validation: no registered schema for ${collection}`);
    return res;
  }
  // console.log(schema);

  const __buildFlattenedSchema = (property, parent, path, flattened) => {
    // if (/^__/.test(property)) continue; // ignore internals
    path.push(property);

    let isRoot = true;
    for (let childProp in parent[property]) {
      if (!parent[property].hasOwnProperty(childProp)) continue;
      if (/^__/.test(childProp)) {
        continue;
      }

      isRoot = false;
      __buildFlattenedSchema(childProp, parent[property], path, flattened);
    }

    if (isRoot === true) {
      flattened[path.join('.')] = parent[property];
      path.pop();
      return;
    }

    path.pop();
    return;
  };

  __schema[collection] = {};
  let path = [];
  for (let property in schema.properties) {
    if (!schema.properties.hasOwnProperty(property)) continue;
    __buildFlattenedSchema(property, schema.properties, path, __schema[collection]);
  }

  Logging.logSilly(__schema[collection]);

  const __buildFlattenedProps = (property, parent, path, flattened) => {
    // if (/^__/.test(property)) continue; // ignore internals
    path.push(property);
    if (typeof parent[property] !== 'object') {
      flattened.push({
        path: path.join('.'),
        value: parent[property]
      });
      path.pop();
      return;
    }

    for (let childProp in parent[property]) {
      if (!parent[property].hasOwnProperty(childProp)) continue;
      __buildFlattenedProps(childProp, parent[property], path, flattened);
    }

    path.pop();
    return;
  };

  __values[collection] = [];
  path = [];
  for (let property in body) {
    if (!body.hasOwnProperty(property)) continue;
    __buildFlattenedProps(property, body, path, __values[collection]);
  }

  Logging.logSilly(__values[collection]);

  for (let property in __schema[collection]) {
    if (!__schema[collection].hasOwnProperty(property)) continue;
    const propVal = __values[collection].find(v => v.path === property);
    const config = __schema[collection][property];
    if (!propVal) {
      if (config.__required) {
        res.isValid = false;
        res.missing.push(property);
      }
      continue;
    }
    if (typeof propVal.value !== config.__type) {
      Logging.logWarn(`Invalid type provided for ${property}: ${propVal.value} [${typeof propVal.value}]`);
      res.isValid = false;
      res.invalid.push(property);
      continue;
    }
  }

  return res;
};

/**
 * @param {String} collection - name of the collection
 * @return {Object} - returns an object with only validated properties
 */
const _applyAppProperties = function(collection) {
  const schema = __schema[collection]; // built during validation phase
  const values = __values[collection]; // built during validation phase

  const res = {};
  for (let property in schema) {
    if (!schema.hasOwnProperty(property)) continue;
    const propVal = values.find(v => v.path === property);
    if (!propVal) continue;
    res[property] = propVal.value;
  }
  return res;
};

module.exports.validateAppProperties = _validateAppProperties;
module.exports.applyAppProperties = _applyAppProperties;

/* ********************************************************************************
 *
 * UPDATE BY PATH
 *
 **********************************************************************************/

/**
 * @param {Object} pathContext - object that defines path specification
 * @return {Object} - returns an object with validation context
 */
let _doValidateUpdate = function(pathContext) {
  return body => {
    Logging.logDebug(`_doValidateUpdate: path: ${body.path}, value: ${body.value}`);
    let res = {
      isValid: false,
      isMissingRequired: true,
      missingRequired: '',
      isPathValid: false,
      invalidPath: '',
      isValueValid: false,
      invalidValid: ''
    };

    if (!body.path) {
      res.missingRequired = 'path';
      return res;
    }
    if (body.value === undefined) {
      res.missingRequired = 'value';
      return res;
    }

    res.missingRequired = false;

    let validPath = false;
    body.contextPath = false;
    for (let pathSpec in pathContext) {
      if (!Object.prototype.hasOwnProperty.call(pathContext, pathSpec)) {
        continue;
      }

      const rex = new RegExp(pathSpec);
      let matches = rex.exec(body.path);
      if (matches) {
        matches.splice(0, 1);
        validPath = true;
        body.contextPath = pathSpec;
        body.contextParams = matches;
        break;
      }
    }

    if (validPath === false) {
      res.invalidPath = `${body.path} <> ${Object.getOwnPropertyNames(pathContext)}`;
      return res;
    }

    res.isPathValid = true;
    if (pathContext[body.contextPath].values.length > 0 &&
        pathContext[body.contextPath].values.indexOf(body.value) === -1) {
      res.invalidValue = `${body.value} <> ${pathContext[body.contextPath].values}`;
      return res;
    }

    res.isValueValid = true;
    res.isValid = true;
    return res;
  };
};

let _doUpdate = (entity, body, pathContext) => {
  return prev => {
    const context = pathContext[body.contextPath];
    const updateType = context.type;
    let response = null;

    switch (updateType) {
      default: {
        throw new Error(`Invalid update type: ${updateType}`);
      }
      case 'vector-add': {
        const vector = entity.get(body.path);
        if (body.value instanceof Object && body.value.id) {
          body.value._id = body.value.id;
          delete body.value.id;
        }
        vector.push(body.value);

        response = vector[vector.length - 1];
        if (response && response.toObject) {
          response = response.toObject();
          response.id = `${response._id}`;
          delete response._id;
        }
      } break;
      case 'vector-rm': {
        const params = body.path.split('.');
        params.splice(-1, 1);
        const index = params.pop();
        const vector = entity.get(params.join('.'));
        vector.splice(index, 1);
        body.path = params.join('.');
        response = {numRemoved: 1, index: index};
      } break;
      case 'scalar':
        if (body.value instanceof Object) {
          for (let field in body.value) {
            if (!Object.prototype.hasOwnProperty.call(body.value, field)) {
              continue;
            }

            Logging.logDebug(`${body.path}.${field} = ${body.value[field]}`);
            entity.set(`${body.path}.${field}`, body.value[field]);
          }
        } else {
          entity.set(body.path, body.value);
        }

        response = entity.get(body.path);
        if (response && response.toObject) {
          response = response.toObject();
          response.id = `${response._id}`;
          delete response._id;
        }
        break;

    }

    return entity.save().then(() => {
      return prev.concat([{
        type: updateType,
        path: body.path,
        value: response
      }]);
    });
  };
};

module.exports.validateUpdate = function(pathContext) {
  return function(body) {
    Logging.logDebug(body instanceof Array);
    if (body instanceof Array === false) {
      body = [body];
    }
    let validation = body.map(_doValidateUpdate(pathContext)).filter(v => v.isValid === false);

    return validation.length >= 1 ? validation[0] : {isValid: true};
  };
};

module.exports.updateByPath = function(pathContext) {
  return function(body) {
    if (body instanceof Array === false) {
      body = [body];
    }
    return body.reduce((promise, update) => {
      return promise
        .then(_doUpdate(this, update, pathContext))
        .catch(Logging.Promise.logError());
    }, Promise.resolve([]));
  };
};

/* ********************************************************************************
 *
 * METADATA
 *
 **********************************************************************************/

/**
 * @param {string} key - index name of the metadata
 * @param {*} value - value of the meta data
 * @return {Promise} - resolves when save operation is completed, rejects if metadata already exists
 */
module.exports.addOrUpdateMetadata = function(key, value) {
  Logging.logSilly(key);
  Logging.logSilly(value);

  let exists = this.metadata.find(m => m.key === key);
  if (exists) {
    exists.value = value;
  } else {
    this.metadata.push({key: key, value: value});
  }

  return this.save().then(u => ({key: key, value: JSON.parse(value)}));
};

module.exports.getAllMetadata = function(collection) {
  return function() {
    collection.find({_app: Model.authApp._id}, {metadata: 1});
  };
};

module.exports.findMetadata = function(key) {
  Logging.log(`findMetadata: ${key}`, Logging.Constants.LogLevel.VERBOSE);
  Logging.log(this.metadata.map(m => ({key: m.key, value: m.value})),
    Logging.Constants.LogLevel.DEBUG);
  let md = this.metadata.find(m => m.key === key);
  return md ? {key: md.key, value: JSON.parse(md.value)} : false;
};

module.exports.rmMetadata = function(key) {
  Logging.log(`rmMetadata: ${key}`, Logging.Constants.LogLevel.VERBOSE);

  return this
    .update({$pull: {metadata: {key: key}}})
    .then(res => res.nModified !== 0);
};
