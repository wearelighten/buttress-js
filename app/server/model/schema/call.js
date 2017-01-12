'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file call.js
 * @description Call model definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

const mongoose = require('mongoose');
const Model = require('../');
const Logging = require('../../logging');

/* ********************************************************************************
 *
 * LOCALS
 *
 **********************************************************************************/

let schema = new mongoose.Schema();
let ModelDef = null;
let constants = {};

/* ********************************************************************************
 *
 * CONSTANTS
 *
 **********************************************************************************/

const status = [
  'unallocated',
  'allocated',
  'completed'
];
const Status = {
  UNALLOCATED: status[0],
  ALLOCATED: status[1],
  COMPLETED: status[2]
};

const connectionOutcome = [
  'no-answer',
  'engaged',
  'invalid-number',
  'connected-wrong-number',
  'connected-not-available',
  'connected'
];
const ConnectionOutcome = {
  NO_ANSWER: connectionOutcome[0],
  ENGAGED: connectionOutcome[1],
  INVALID: connectionOutcome[2],
  CONNECTED_WRONG_NUMBER: connectionOutcome[3],
  CONNECTED_NOT_AVAILABLE: connectionOutcome[4],
  CONNECTED: connectionOutcome[5]
};

const outcome = [
  'call-back',
  'not-interested',
  'appointment-made',
  'successful-transaction'
];
const Outcome = {
  CALL_BACK: outcome[0],
  NOT_INTERESTED: outcome[1],
  APPOINTMENT_MADE: outcome[2],
  SUCCESSFUL_TRANSACTION: outcome[3]
};

constants.Status = Status;
constants.ConnectionOutcome = ConnectionOutcome;
constants.Outcome = Outcome;

/* ********************************************************************************
 *
 * SCHEMA
 *
 **********************************************************************************/

schema.add({
  status: {
    type: String,
    enum: status
  },
  _app: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'App'
  },
  _contactlist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contactlist'
  },
  _company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  _person: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person'
  },
  _owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  connections: [{
    start: {
      type: Date,
      default: Date.create
    },
    end: {
      type: Date,
      default: Date.create
    },
    outcome: {
      type: String,
      enum: connectionOutcome
    }
  }],
  outcome: {
    type: String,
    enum: outcome
  },
  metadata: [{key: String, value: String}]
});

/* ********************************************************************************
 *
 * VIRTUALS
 *
 **********************************************************************************/
schema.virtual('details').get(function() {
  return {
    id: this._id,
    contactListId: this._contactList && this._contactList._id ? this._contactList._id : this._contactList,
    companyId: this._company && this._company._id ? this._company._id : this._company,
    personId: this._person && this._person._id ? this._person._id : this._person,
    ownerId: this._owner && this._owner._id ? this._owner._id : this._owner,
    connections: this.connections,
    outcome: this.outcome
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

  if (!body.companyId && !body.personId) {
    res.isValid = false;
    res.missing.push('data');
  }
  if (!body.ownerId) {
    res.isValid = false;
    res.missing.push('owner');
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
      _owner: body.ownerId,
      name: body.name,
      _contactList: body.contactListId,
      _company: body.companyId,
      _person: body.personId
    });

    return cl.save()
      .then(cl => prev.concat([cl]));
  };
};

schema.statics.add = (contactList, body) => {
  if (body instanceof Array === false) {
    body = [body];
  }

  return body.reduce((promise, item) => {
    return promise
      .then(__add(contactList, item))
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
 * METHODS
 *
 **********************************************************************************/

/**
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.methods.rm = function() {
  return ModelDef.remove({_id: this._id});
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
schema.methods.addOrUpdateMetadata = function(key, value) {
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

schema.methods.findMetadata = function(key) {
  Logging.log(`findMetadata: ${key}`, Logging.Constants.LogLevel.VERBOSE);
  Logging.log(this.metadata.map(m => ({key: m.key, value: m.value})),
    Logging.Constants.LogLevel.DEBUG);
  let md = this.metadata.find(m => m.key === key);
  return md ? {key: md.key, value: JSON.parse(md.value)} : false;
};

schema.methods.rmMetadata = function(key) {
  Logging.log(`rmMetadata: ${key}`, Logging.Constants.LogLevel.VERBOSE);

  return this
    .update({$pull: {metadata: {key: key}}})
    .then(res => res.nModified !== 0);
};

ModelDef = mongoose.model('Call', schema);

module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;

