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
const ObjectId = require('mongodb').ObjectId;

require('sugar');

/* ********************************************************************************
 *
 * CONSTANTS
 *
 **********************************************************************************/

/* ********************************************************************************
*
* DB HELPERS
*
**********************************************************************************/

module.exports.add = (collection, __add) => {
  return body => {
    if (body instanceof Array === false) {
      body = [body];
    }

    return body.reduce((promise, item) => {
      return promise
        .then(__add(item))
        .catch(Logging.Promise.logError());
    }, Promise.resolve([]))
    .then(documents => {
      return new Promise((resolve, reject) => {
        const ops = documents.map(c => {
          return {
            insertOne: {
              document: c
            }
          };
        });
        collection.bulkWrite(ops, (err, res) => {
          if (err) {
            reject(err);
            return;
          }

          const insertedIds = Object.values(res.insertedIds);
          if (insertedIds.length === 0 || insertedIds.length > 1) {
            resolve(insertedIds);
            return;
          }

          collection.findOne({_id: new ObjectId(insertedIds[0])}, {metadata: 0}, (err, doc) => {
            if (err) throw err;
            doc.id = doc._id;
            delete doc._id;
            resolve(doc);
          });
        });
      });
    });
  };
};

/* ********************************************************************************
*
* SCHEMA HELPERS
*
**********************************************************************************/
const __getCollectionSchema = collection => {
  if (!Model.authApp.__schema) {
    Logging.logSilly(`App property validation: no registered schema for ${Model.authApp.id}`);
    return false;
  }
  const appSchema = Model.authApp.__schema;
  const schema = appSchema.find(r => r.collection === collection);
  if (!schema) {
    Logging.logSilly(`App property validation: no registered schema for ${collection}`);
    return false;
  }

  return schema;
};

const __getFlattenedSchema = schema => {
  const __buildFlattenedSchema = (property, parent, path, flattened) => {
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

  const flattened = {};
  const path = [];
  for (let property in schema.properties) {
    if (!schema.properties.hasOwnProperty(property)) continue;
    __buildFlattenedSchema(property, schema.properties, path, flattened);
  }

  Logging.logSilly(flattened);
  return flattened;
};

const __getFlattenedBody = body => {
  const __buildFlattenedBody = (property, parent, path, flattened) => {
    // if (/^__/.test(property)) continue; // ignore internals
    path.push(property);
    if (typeof parent[property] !== 'object' || Array.isArray(parent[property])) {
      flattened.push({
        path: path.join('.'),
        value: parent[property]
      });
      path.pop();
      return;
    }

    for (let childProp in parent[property]) {
      if (!parent[property].hasOwnProperty(childProp)) continue;
      __buildFlattenedBody(childProp, parent[property], path, flattened);
    }

    path.pop();
    return;
  };

  const flattened = [];
  const path = [];
  for (let property in body) {
    if (!body.hasOwnProperty(property)) continue;
    __buildFlattenedBody(property, body, path, flattened);
  }

  Logging.logSilly(flattened);
  return flattened;
};

const __validateProp = (prop, config) => {
  let type = typeof prop.value;
  let valid = false;

  switch (config.__type) {
    default:
    case 'number':
      if (type === 'string') {
        const number = parseInt(prop.value, 10);
        if (Number.isNaN(number) === false) {
          prop.value = number;
          type = typeof prop.value;
        }
        Logging.logSilly(`${number} [${type}]`);
      }
      valid = type === config.__type;
      break;
    case 'object':
      valid = type === config.__type;
      break;
    case 'string':
      valid = type === config.__type;
      if (config.__enum && Array.isArray(config.__enum)) {
        valid = config.__enum.indexOf(prop.value) !== -1;
      }
      break;
    case 'array':
      valid = Array.isArray(prop.value);
      break;
    case 'date':
      if (prop.value === null) {
        valid = true;
      } else {
        let date = new Date(prop.value);
        valid = date.isValid();
        if (valid) {
          prop.value = date;
        }
      }
      break;
  }

  return valid;
};

const __validate = (schema, values) => {
  const res = {
    isValid: true,
    missing: [],
    invalid: []
  };

  const __getDefault = config => {
    let res;
    switch (config.__type) {
      default:
      case 'string':
      case 'number':
      case 'array':
      case 'object':
        res = config.__default;
        break;
      case 'date':
        if (config.__default === null) {
          res = null;
        } else if (config.__default) {
          res = new Date(config.__default);
        } else {
          res = new Date();
        }
    }
    return res;
  };

  for (let property in schema) {
    if (!schema.hasOwnProperty(property)) continue;
    let propVal = values.find(v => v.path === property);
    const config = schema[property];

    if (!propVal && config.__default !== undefined) {
      propVal = {
        path: property,
        value: __getDefault(config)
      };
      values.push(propVal);
    }

    if (!propVal) {
      if (config.__required) {
        res.isValid = false;
        Logging.logWarn(`Missing '__require'd ${property}`);
        res.missing.push(property);
      }
      continue;
    }

    if (!__validateProp(propVal, config)) {
      Logging.logWarn(`Invalid ${property}: ${propVal.value} [${typeof propVal.value}]`);
      res.isValid = false;
      res.invalid.push(property);
    }
  }

  Logging.logSilly(res.missing);
  Logging.logSilly(res.invalid);

  return res;
};

/* ********************************************************************************
*
* APP-SPECIFIC SCHEMA
*
**********************************************************************************/
const _validateAppProperties = function(collection, body) {
  const schema = __getCollectionSchema(collection);
  if (schema === false) return {isValid: true};

  const flattenedSchema = __getFlattenedSchema(schema);
  const flattenedBody = __getFlattenedBody(body);

  return __validate(flattenedSchema, flattenedBody);
};

const __inflateObject = (parent, path, value) => {
  if (path.length > 1) {
    let parentKey = path.shift();
    parent[parentKey] = {};
    __inflateObject(parent[parentKey], path, value);
    return;
  }

  parent[path.shift()] = value;
  return;
};

/**
 * @param {String} collection - name of the collection
 * @param {Object} body - object containing properties to be applied
 * @return {Object} - returns an object with only validated properties
 */
const _applyAppProperties = function(collection, body) {
  const schema = __getCollectionSchema(collection);
  if (schema === false) return {isValid: true};

  const flattenedSchema = __getFlattenedSchema(schema);
  const flattenedBody = __getFlattenedBody(body);

  const res = {};
  const objects = {};
  for (let property in flattenedSchema) {
    if (!flattenedSchema.hasOwnProperty(property)) continue;
    const propVal = flattenedBody.find(v => v.path === property);
    if (!propVal) continue;
    const config = flattenedSchema[property];
    __validateProp(propVal, config);

    const path = propVal.path.split('.');
    const root = path.shift();
    let value = propVal.value;
    if (path.length > 0) {
      if (!objects[root]) {
        objects[root] = {};
      }
      __inflateObject(objects[root], path, value);
      value = objects[root];
    }

    res[root] = value;
  }
  Logging.logSilly(res);
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
 * @param {Object} flattenedSchema - schema object keyed on path
 * @return {Object} - returns an object with validation context
 */
let _doValidateUpdate = function(pathContext, flattenedSchema) {
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

    const config = flattenedSchema[body.path];
    if (config && !__validateProp(body, config)) {
      res.invalidValue = `${body.path} failed schema test`;
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
        if (body.value instanceof Date === false && body.value instanceof Object === true) {
          for (let field in body.value) {
            if (!Object.prototype.hasOwnProperty.call(body.value, field)) {
              continue;
            }

            Logging.logDebug(`${body.path}.${field} = ${body.value[field]}`);
            entity.set(`${body.path}.${field}`, body.value[field]);
          }
        } else {
          Logging.logSilly(`${body.path}: ${body.value}`);
          entity.set(body.path, body.value, {strict: false});
        }

        response = entity.get(body.path);
        if (response && response.toObject) {
          response = response.toObject();
          response.id = `${response._id}`;
          delete response._id;
        }
        Logging.logSilly(response);
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

const __extendPathContext = (pathContext, schema) => {
  if (!schema) return pathContext;
  const extended = {};
  for (let property in schema) {
    if (!schema.hasOwnProperty(property)) continue;
    const config = schema[property];
    if (!config.__allowUpdate) continue;
    switch (config.__type) {
      default:
      case 'object':
      case 'number':
      case 'date':
        extended[`^${property}$`] = {type: 'scalar', values: []};
        break;
      case 'string':
        if (config.__enum) {
          extended[`^${property}$`] = {type: 'scalar', values: config.__enum};
        } else {
          extended[`^${property}$`] = {type: 'scalar', values: []};
        }
        break;
      case 'array':
        extended[`^${property}$`] = {type: 'vector-add', values: []};
        extended[`^${property}.([0-9]{1,3}).__remove__$`] = {type: 'vector-rm', values: []};
        extended[`^${property}.([0-9]{1,3})$`] = {type: 'scalar', values: []};
        break;
    }
  }
  return Object.assign(extended, pathContext);
};

module.exports.validateUpdate = function(pathContext, collection) {
  return function(body) {
    Logging.logDebug(body instanceof Array);
    if (body instanceof Array === false) {
      body = [body];
    }

    const schema = __getCollectionSchema(collection);
    const flattenedSchema = schema ? __getFlattenedSchema(schema) : false;
    const extendedPathContext = __extendPathContext(pathContext, flattenedSchema);

    let validation = body.map(_doValidateUpdate(extendedPathContext, flattenedSchema)).filter(v => v.isValid === false);

    return validation.length >= 1 ? validation[0] : {isValid: true};
  };
};

module.exports.updateByPath = function(pathContext, collection) {
  return function(body) {
    if (body instanceof Array === false) {
      body = [body];
    }
    const schema = __getCollectionSchema(collection);
    const flattenedSchema = schema ? __getFlattenedSchema(schema) : false;
    const extendedPathContext = __extendPathContext(pathContext, flattenedSchema);

    return body.reduce((promise, update) => {
      const config = flattenedSchema[update.path];
      return promise
        .then(_doUpdate(this, update, extendedPathContext, config));
    }, Promise.resolve([]))
      .catch(Logging.Promise.logError());
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
