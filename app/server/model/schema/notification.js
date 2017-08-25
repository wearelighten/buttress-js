'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file notification.js
 * @description Notification model definition.
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
let schema = new mongoose.Schema();
let ModelDef = null;
const collectionName = 'notifications';
const collection = Model.mongoDb.collection(collectionName);

/* ********************************************************************************
 *
 * CONSTANTS
 *
 **********************************************************************************/
let constants = {};
const types = [
  'chat',
  'company',
  'campaign',
  'contact-list',
  'call',
  'appointment',
  'task',
  'contract',
  'post'
];
const Type = {
  CHAT: types[0],
  COMPANY: types[1],
  CAMPAIGN: types[2],
  CONTACT_LIST: types[3],
  CALL: types[4],
  APPOINTMENT: types[5],
  TASK: types[6],
  CONTRACT: types[7],
  POST: types[8]
};

constants.Type = Type;

/* ********************************************************************************
 *
 * SCHEMA
 *
 **********************************************************************************/
schema.add({
  name: String,
  type: {
    type: String,
    enum: types
  },
  _app: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'App'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  dateCreated: {
    type: Date,
    default: Sugar.Date.create
  },
  read: {
    type: Boolean,
    default: false
  }
});

/* ********************************************************************************
 *
 * VIRTUALS
 *
 **********************************************************************************/
schema.virtual('details').get(function() {
  return {
    id: this._id,
    name: this.name,
    type: this.type,
    userId: this.userId,
    entityId: this.entityId,
    dateCreated: this.dateCreated,
    read: this.read
  };
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
  if (!body.userId) {
    res.isValid = false;
    res.missing.push('userId');
  }
  if (!body.type) {
    res.isValid = false;
    res.missing.push('type');
  }
  if (types.indexOf(body.type) === -1) {
    res.isValid = false;
    res.invalid.push('type');
  }
  if (body.type !== Type.CHAT && !body.entityId) {
    res.isValid = false;
    res.missing.push('entityId');
  }

  let app = Shared.validateAppProperties('notifications', body);
  if (app.isValid === false) {
    res.isValid = false;
    res.invalid = res.invalid.concat(app.invalid);
    res.missing = res.missing.concat(app.missing);
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
    const md = {
      _app: Model.authApp._id,
      name: body.name,
      userId: body.userId,
      type: body.type,
      entityId: body.entityId,
      dateCreated: body.dateCreated ? body.dateCreated : new Date(),
      read: false
    };

    if (body.id) {
      md._id = new ObjectId(body.id);
    }

    const validated = Shared.applyAppProperties(collectionName, body);
    return prev.concat([Object.assign(md, validated)]);
  };
};

schema.statics.add = Shared.add(collection, __add);

/**
 * @return {Promise} - resolves to an array of Apps (native Mongoose objects)
 */
schema.statics.getAll = () => {
  Logging.log(`getAll: ${Model.authApp._id}`, Logging.Constants.LogLevel.DEBUG);
  return collection.find({_app: Model.authApp._id}, {metadata: 0});
};

schema.statics.rmAll = () => {
  return ModelDef.remove({});
};

/* ********************************************************************************
 *
 * UPDATE BY PATH
 *
 **********************************************************************************/

const PATH_CONTEXT = {
  '^read$': {type: 'scalar', values: [true, false]}
};

schema.statics.validateUpdate = Shared.validateUpdate(PATH_CONTEXT, 'notifications');
schema.methods.updateByPath = Shared.updateByPath(PATH_CONTEXT);

/**
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.methods.rm = function() {
  return ModelDef.remove({_id: this._id});
};

ModelDef = mongoose.model('Notification', schema);

module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;

