'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file notification.js
 * @description Notification model definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

const mongoose = require('mongoose');
const Model = require('../');
const Logging = require('../../logging');
const Shared = require('../shared');

/* ********************************************************************************
 *
 * LOCALS
 *
 **********************************************************************************/
let schema = new mongoose.Schema();
let ModelDef = null;

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
  'task'
];
const Type = {
  CHAT: types[0],
  COMPANY: types[1],
  CAMPAIGN: types[2],
  CONTACT_LIST: types[3],
  CALL: types[4],
  APPOINTMENT: types[5],
  TASK: types[5]
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
  _user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  dateCreated: {
    type: Date,
    default: Date.create
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
    userId: this._user && this._user._id ? this._user._id : this._user,
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
    const cl = new ModelDef({
      _app: Model.authApp._id,
      name: body.name,
      _user: body.userId,
      type: body.type,
      entityId: body.entityId
    });

    return cl.save()
      .then(cl => prev.concat([cl]));
  };
};

schema.statics.add = body => {
  if (body instanceof Array === false) {
    body = [body];
  }

  return body.reduce((promise, item) => {
    return promise
      .then(__add(item))
      .catch(Logging.Promise.logError());
  }, Promise.resolve([]));
};

/**
 * @return {Promise} - resolves to an array of Apps (native Mongoose objects)
 */
schema.statics.getAll = () => {
  Logging.log(`getAll: ${Model.authApp._id}`, Logging.Constants.LogLevel.DEBUG);
  return ModelDef.find({_app: Model.authApp._id});
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

schema.statics.validateUpdate = Shared.validateUpdate(PATH_CONTEXT);
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

