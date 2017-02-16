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
const Shared = require('../shared');

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
  'pending',
  'in-progress',
  'deferred',
  'done'
];
const Status = {
  PENDING: status[0],
  IN_PROGRESS: status[1],
  DEFERRED: status[2],
  SUCCEEDED: status[3],
  FAILED: status[4]
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
  INVALID_NUMBER: connectionOutcome[2],
  CONNECTED_WRONG_NUMBER: connectionOutcome[3],
  CONNECTED_NOT_AVAILABLE: connectionOutcome[4],
  CONNECTED: connectionOutcome[5]
};

const outcome = [
  'no-outcome',
  'call-back',
  'not-interested',
  'appointment-made',
  'successful-transaction',
  'invalid-number',
  'wrong-number'
];
const Outcome = {
  NO_OUTCOME: outcome[0],
  CALL_BACK: outcome[1],
  NOT_INTERESTED: outcome[2],
  APPOINTMENT_MADE: outcome[3],
  SUCCESSFUL_TRANSACTION: outcome[4],
  INVALID_NUMBER: outcome[5],
  WRONG_NUMBER: outcome[6]
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
    enum: status,
    default: Status.PENDING
  },
  _app: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'App'
  },
  _contactList: {
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
    enum: outcome,
    default: Outcome.NO_OUTCOME
  },
  metadata: [{key: String, value: String}],
  notes: [{
    text: String,
    timestamp: {
      type: Date,
      default: Date.create
    }}]
});

/* ********************************************************************************
 *
 * VIRTUALS
 *
 **********************************************************************************/
schema.virtual('details').get(function() {
  return {
    id: this._id,
    status: this.status,
    outcome: this.outcome,
    contactListId: this._contactList && this._contactList._id ? this._contactList._id : this._contactList,
    companyId: this._company && this._company._id ? this._company._id : this._company,
    personId: this._person && this._person._id ? this._person._id : this._person,
    ownerId: this._owner && this._owner._id ? this._owner._id : this._owner,
    connections: this.connections,
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

/* ********************************************************************************
 *
 * UPDATE BY PATH
 *
 **********************************************************************************/

const PATH_CONTEXT = {
  '^status$': {type: 'scalar', values: status},
  '^outcome$': {type: 'scalar', values: outcome},
  '^connections$': {type: 'vector-add', values: []},
  '^notes$': {type: 'vector-add', values: []},
  '^notes.([0-9]{1,3}).__remove__$': {type: 'vector-rm', values: []},
  '^notes.([0-9]{1,3}).text$': {type: 'scalar', values: []}
};

schema.statics.validateUpdate = Shared.validateUpdate(PATH_CONTEXT);
schema.methods.updateByPath = Shared.updateByPath(PATH_CONTEXT);

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

ModelDef = mongoose.model('Call', schema);

module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;

