'use strict';

/**
 * ButtressJS - Realtime datastore for business software
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
  'progressed',
  'success'
];
const Outcomes = {
  FAIL: outcomes[0],
  DEFER: outcomes[1],
  PROGRESSED: outcomes[2],
  SUCCESS: outcomes[3]
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
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedToUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedToAccepted: {
    type: Boolean,
    default: false
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  contactId: String,
  locationId: String,
  intelApproval: {
    status: {
      type: String,
      default: 'pending'
    },
    timestamp: {
      type: Date,
      default: Date.create
    },
    approverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
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
    ownerId: this.ownerId && this.ownerId._id ? this.ownerId._id : this.ownerId,
    assignedToUserId: this.assignedToUserId && this.assignedToUserId._id ? this.assignedToUserId._id : this.assignedToUserId,
    assignedToAccepted: this.assignedToAccepted,
    companyId: this.companyId && this.companyId._id ? this.companyId._id : this.companyId,
    contactId: this.contactId,
    calendarEntryId: this.calendarEntryId,
    locationId: this.locationId,
    intelApproval: this.intelApproval,
    date: this.date,
    outcome: this.outcome,
    reason: this.reason,
    notes: this.notes.map(n => ({text: n.text, timestamp: n.timestamp, userId: n.userId}))
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
  if (!body.contactId) {
    res.missing.push('contactId');
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
      ownerId: body.ownerId,
      assignedToId: body.assignedToId,
      companyId: body.companyId,
      contactId: body.contactId,
      locationId: body.locationId,
      notes: body.notes
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
  '^outcome$': {type: 'scalar', values: Outcomes},
  '^(reason|contactId|locationId|date|calendarEntryId|assignedToUserId)$': {type: 'scalar', values: []},
  '^intelApproval$': {type: 'scalar', values: []},
  '^notes$': {type: 'vector-add', values: []},
  '^notes.([0-9]{1,3}).__remove__$': {type: 'vector-rm', values: ['']},
  '^notes.([0-9]{1,3}).text$': {type: 'scalar', values: []}
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
