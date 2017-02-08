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
  metadata: [{key: String, value: String}],
  notes: [{
    text: String,
    timestamp: {
      type: Date,
      default: Date.create
    }
  }]
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
    reason: this.reason,
    notes: this.notes.map(n => ({text: n.text, timestamp: n.timestamp}))
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
    res.missing.push('contact.name');
    return res;
  }
  if (!body.contact.email && !body.contact.landline && !body.contact.mobile) {
    res.missing.push('contact.details');
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
 * UPDATE BY PATH
 *
 **********************************************************************************/

const PATH_CONTEXT = {
  'outcome': {type: 'scalar', values: [Outcomes.SUCCESS, Outcomes.DEFER, Outcomes.FAIL]},
  'reason': {type: 'scalar', values: []},
  'contact.name': {type: 'scalar', values: []},
  'contact.email': {type: 'scalar', values: []},
  'notes': {type: 'vector-add', values: []},
  'notes.([0-9]{1,3})': {type: 'vector-rm', values: ['remove']},
  'notes.([0-9]{1,3}).text': {type: 'scalar', values: []}
};

schema.statics.validateUpdate = Shared.validateUpdate(PATH_CONTEXT);
schema.methods.updateByPath = Shared.updateByPath(PATH_CONTEXT);

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

schema.methods.addOrUpdateMetadata = Shared.addOrUpdateMetadata;
schema.methods.findMetadata = Shared.findMetadata;
schema.methods.rmMetadata = Shared.rmMetadata;

/* ********************************************************************************
 *
 * EXPORTS
 *
 **********************************************************************************/
ModelDef = mongoose.model('Appointment', schema);

module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
