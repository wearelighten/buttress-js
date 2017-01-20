'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file appointment.js
 * @description Appointment model definition.
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

/* ********************************************************************************
 *
 * EMBEDDED DEPENDENCIES
 *
 **********************************************************************************/
Model.initModel('Contact');

/* ********************************************************************************
 *
 * CONSTANTS
 *
 **********************************************************************************/
let constants = {};

const outcomes = [
  'fail',
  'defer',
  'success'
];
const Outcomes = {
  FAIL: outcomes[0],
  DEFER: outcomes[1],
  SUCCESS: outcomes[2]
};

constants.Outcomes = Outcomes;

/* ********************************************************************************
 *
 * SCHEMA
 *
 **********************************************************************************/
schema.add({
  name: String,
  _app: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'App'
  },
  _owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  _assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  _company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  contact: Model.Schema.Contact,
  calendarEntryId: String,
  date: {
    type: Date
  },
  outcome: {
    type: String,
    enum: outcomes
  },
  reason: {
    type: String
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
    name: this.name,
    ownerId: this._owner && this._owner._id ? this._owner._id : this._owner,
    assignedToId: this._assignedTo && this._assignedTo._id ? this._assignedTo._id : this._assignedTo,
    companyId: this._company && this._company._id ? this._company._id : this._company,
    contact: this.contact,
    date: this.date,
    outcome: this.outcome,
    reason: this.reason
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
    isValid: false,
    missing: [],
    invalid: []
  };

  if (!body.name) {
    res.missing.push('name');
    return res;
  }
  if (!body.ownerId) {
    res.missing.push('ownerId');
    return res;
  }
  if (!body.assignedToId) {
    res.missing.push('assignedToId');
    return res;
  }
  if (!body.companyId) {
    res.missing.push('companyId');
    return res;
  }
  if (!body.contact.name) {
    res.missing.push('companyId');
    return res;
  }
  if (!body.contact.email) {
    res.missing.push('email');
    return res;
  }
  if (!body.date) {
    res.missing.push('date');
    return res;
  }

  res.isValid = true;
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
    Logging.logDebug(body);
    const cl = new ModelDef({
      _app: Model.authApp._id,
      name: body.name,
      date: Date.create(body.date),
      _owner: body.ownerId,
      _assignedTo: body.assignedToId,
      _company: body.companyId,
      contact: body.contact
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
 * METHODS
 *
 **********************************************************************************/

/**
 * @param {Object} body - body passed through from a POST request to be validated
 * @return {Object} - returns an object with validation context
 */
let _doValidateUpdate = body => {
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
  if (!body.value) {
    res.missingRequired = 'path';
    return res;
  }

  res.missingRequired = false;
  const validPaths = {
    'outcome': [Outcomes.SUCCESS, Outcomes.DEFER, Outcomes.FAIL],
    'reason': [],
    'contact.name': [],
    'contact.email': []
  };
  if (!validPaths[body.path]) {
    res.invalidPath = `${body.path} <> ${Object.getOwnPropertyNames(validPaths)}`;
    return res;
  }

  res.isPathValid = true;
  if (validPaths[body.path].length > 0 && validPaths[body.path].indexOf(body.value) === -1) {
    res.invalidValue = `${body.value} <> ${validPaths[body.path]}`;
    return res;
  }

  res.isValueValid = true;
  res.isValid = true;
  return res;
};

schema.statics.validateUpdate = body => {
  Logging.logDebug(body instanceof Array);
  if (body instanceof Array === false) {
    body = [body];
  }

  let validation = body.map(_doValidateUpdate).filter(v => v.isValid === false);

  return validation.length >= 1 ? validation[0] : {isValid: true};
};

let _doUpdate = (appointment, body) => {
  return prev => {
    appointment.set(body.path, body.value);
    return appointment.save().then(() => prev.concat([true]));
  };
};

schema.methods.updateByPath = function(body) {
  if (body instanceof Array === false) {
    body = [body];
  }
  return body.reduce((promise, update) => {
    return promise
      .then(_doUpdate(this, update))
      .catch(Logging.Promise.logError());
  }, Promise.resolve([]));
};

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
  if (!key) {
    return this.metadata.reduce((prev, m) => {
      prev[m.key] = JSON.parse(m.value);
      return prev;
    }, {});
  }
  Logging.log(`findMetadata: ${key}`, Logging.Constants.LogLevel.VERBOSE);
  Logging.logDebug(this.metadata.map(m => ({key: m.key, value: m.value})));
  let md = this.metadata.find(m => m.key === key);
  return md ? {key: md.key, value: JSON.parse(md.value)} : false;
};

schema.methods.rmMetadata = function(key) {
  Logging.log(`rmMetadata: ${key}`, Logging.Constants.LogLevel.VERBOSE);

  // return Promise.resolve(true);
  return this
    .update({$pull: {metadata: {key: key}}})
    .then(res => res.nModified !== 0);
};

/* ********************************************************************************
 *
 * EXPORTS
 *
 **********************************************************************************/
ModelDef = mongoose.model('Appointment', schema);

module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
