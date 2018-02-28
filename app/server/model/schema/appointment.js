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
const collectionName = 'appointments';
const collection = Model.mongoDb.collection(collectionName);

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
  'success',
  'pending'
];
const Outcomes = {
  FAIL: outcomes[0],
  DEFER: outcomes[1],
  PROGRESSED: outcomes[2],
  SUCCESS: outcomes[3],
  PENDING: outcomes[4]
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
  tag: String,
  contactId: String,
  locationId: String,
  intelApproval: {
    status: {
      type: String,
      default: 'pending'
    },
    timestamp: {
      type: Date,
      default: Sugar.Date.create
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
      default: Sugar.Date.create
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
    tag: this.tag,
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
    isValid: true,
    missing: [],
    invalid: []
  };

  if (!body.name) {
    res.isValid = false;
    res.missing.push('name');
    return res;
  }
  if (!body.ownerId) {
    res.isValid = false;
    res.missing.push('ownerId');
    return res;
  }
  if (!body.assignedToUserId) {
    res.isValid = false;
    res.missing.push('assignedToUserId');
    return res;
  }
  if (!body.companyId) {
    res.isValid = false;
    res.missing.push('companyId');
    return res;
  }
  // if (!body.contactId) {
  //   res.isValid = false;
  //   res.missing.push('contactId');
  //   return res;
  // }
  // if (!body.date) {
  //   res.missing.push('date');
  //   return res;
  // }

  let app = Shared.validateAppProperties(collectionName, body);
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
    Logging.logDebug(body);
    const md = {
      _app: Model.authApp._id,
      name: body.name,
      date: Sugar.Date.create(body.date),
      ownerId: body.ownerId,
      outcome: body.outcome ? body.outcome : Outcomes.PENDING,
      assignedToUserId: body.assignedToUserId,
      tag: body.tag ? body.tag : '',
      companyId: body.companyId,
      contactId: body.contactId,
      locationId: body.locationId,
      intelApproval: {status: 'pending'},
      notes: body.notes ? body.notes : []
    };

    if (body.id) {
      md._id = new ObjectId(body.id);
    }

    const validated = Shared.applyAppProperties(collectionName, body);
    return prev.concat([Object.assign(md, validated)]);
  };
};

schema.statics.add = Shared.add(collection, __add);

schema.statics.exists = id => {
  return collection.find({_id: new ObjectId(id)})
    .limit(1)
    .count()
    .then(count => count > 0);
};

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
  '^name$': {type: 'scalar', values: []},
  '^outcome$': {type: 'scalar', values: Outcomes},
  '^(reason|tag|contactId|locationId|date|calendarEntryId|assignedToUserId|assignedToAccepted)$': {type: 'scalar', values: []},
  '^intelApproval$': {type: 'scalar', values: []},
  '^notes$': {type: 'vector-add', values: []},
  '^notes.([0-9]{1,11}).__remove__$': {type: 'vector-rm', values: ['']},
  '^notes.([0-9]{1,11}).text$': {type: 'scalar', values: []}
};

schema.statics.validateUpdate = Shared.validateUpdate(PATH_CONTEXT, collectionName);
schema.statics.updateByPath = Shared.updateByPath(PATH_CONTEXT, collectionName, collection);

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
schema.statics.getAllMetadata = Shared.getAllMetadata(collection);

/* ********************************************************************************
 *
 * EXPORTS
 *
 **********************************************************************************/
ModelDef = mongoose.model('Appointment', schema);

module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
