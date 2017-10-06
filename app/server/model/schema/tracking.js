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
const mongoose = require('mongoose');
const ObjectId = require('mongodb').ObjectId;
const Model = require('../');
const Logging = require('../../logging');
const Shared = require('../shared');
const Sugar = require('sugar');

/* ********************************************************************************
 *
 * LOCALS
 *
 **********************************************************************************/
const schema = new mongoose.Schema();
let ModelDef = null;
const collectionName = 'trackings';
const collection = Model.mongoDb.collection(collectionName);

/**
 * Constants
 */

const type = ['interaction', 'error', 'logging'];
const Type = {
  INTERACTION: type[0],
  ERROR: type[1],
  LOGGING: type[2]
};

const constants = {
  Type: Type
};

/**
 * Schema
 */
schema.add({
  timestamp: {
    type: Date,
    default: Sugar.Date.create
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  name: String,
  type: {
    type: String,
    enum: type
  },
  interaction: {
    type: String,
    location: String,
    context: String
  },
  error: {
    message: String,
    url: String,
    line: String,
    col: String
  },
  logging: {
    level: String
  },
  environment: {
    browser: String,
    os: String,
    resolution: String,
    dpi: String,
    ram: String
  },

  _app: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    index: true
  }
});

/* ********************************************************************************
 *
 * STATICS
 *
 **********************************************************************************/
/**
 * @param {Object} body - body passed through from a POST request to be validated
 * @return {Object} - returns an object with validation context
 */
const __doValidation = body => {
  let res = {
    isValid: true,
    missing: [],
    invalid: []
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
};

schema.statics.validate = body => {
  if (body instanceof Array === false) {
    body = [body];
  }
  let validation = body.map(__doValidation).filter(v => v.isValid === false);

  return validation.length >= 1 ? validation[0] : {isValid: true};
};

/*
 * @param {Object} body - body passed through from a POST request
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
const __add = body => {
  return prev => {
    prev.push({
      _app: Model.authApp._id,
      userId: Model.authUser._id,
      timestamp: Sugar.Date.create(),
      name: body.name,
      type: body.type,
      interaction: body.interaction,
      error: body.error,
      logging: body.logging,
      environment: body.environment
    });
    return prev;
  };
};

schema.statics.add = Shared.add(collection, __add);

/**
 * @return {Promise} - resolves to an array of Apps (native Mongoose objects)
 */
schema.statics.findAll = () => {
  Logging.log(`findAll: ${Model.authApp._id}`, Logging.Constants.LogLevel.DEBUG);

  if (Model.token.authLevel === Model.Constants.Token.AuthLevel.SUPER) {
    return ModelDef.find({});
  }

  return ModelDef.find({_app: Model.authApp._id});
};

/**
 * @param {String} id - Object id as a hex string
 * @return {Promise} - resolves to an array of Apps (native Mongoose objects)
 */
schema.statics.getFromId = id => {
  return new Promise(resolve => {
    collection.findOne({_id: new ObjectId(id)}, {metadata: 0}, (err, doc) => {
      if (err) throw err;
      doc.id = doc._id;
      delete doc._id;
      resolve(doc);
    });
  });
};
/**
 * @return {Promise} - resolves to an array of Apps (native Mongoose objects)
 */
schema.statics.getAll = () => {
  return collection.find({_app: Model.authApp._id}, {metadata: 0});
};

schema.statics.rmAll = () => {
  return ModelDef.remove({_app: Model.authApp._id});
};

/* ********************************************************************************
*
* EXPORTS
*
**********************************************************************************/
ModelDef = mongoose.model('Tracking', schema);
module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
