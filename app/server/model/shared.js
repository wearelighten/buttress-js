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
  Logging.log(key, Logging.Constants.LogLevel.DEBUG);
  Logging.log(value, Logging.Constants.LogLevel.DEBUG);

  let exists = this.metadata.find(m => m.key === key);
  if (exists) {
    exists.value = value;
  } else {
    this.metadata.push({key: key, value: value});
  }

  return this.save().then(u => ({key: key, value: JSON.parse(value)}));
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
