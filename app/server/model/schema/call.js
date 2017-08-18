'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file call.js
 * @description Call model definition.
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

/* ********************************************************************************
 *
 * LOCALS
 *
 **********************************************************************************/

let schema = new mongoose.Schema();
let ModelDef = null;
const collectionName = 'calls';
const collection = Model.mongoDb.collection(collectionName);
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

const connectionStatus = [
  'connected',
  'disconnected'
];
const ConnectionStatus = {
  CONNECTED: connectionStatus[0],
  DISCONNECTED: connectionStatus[1]
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
constants.ConnectionStatus = ConnectionStatus;
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
  contactListId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contactlist'
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  connections: [{
    status: {
      type: String,
      enum: connectionStatus,
      default: Status.DISCONNECTED
    },
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
    contactListId: this.contactListId,
    companyId: this.companyId,
    ownerId: this.ownerId,
    connections: this.connections,
    intelApproval: this.intelApproval,
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

  if (!body.companyId) {
    res.isValid = false;
    res.missing.push('data');
  }
  if (!body.ownerId) {
    res.isValid = false;
    res.missing.push('owner');
  }

  let app = Shared.validateAppProperties(collectionName, body);
  if (app.isValid === false) {
    res.isValid = false;
    res.invalid = res.invalid.concat(app.invalid);
    res.missing = res.invalid.concat(app.missing);
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
      ownerId: body.ownerId,
      status: Status.PENDING,
      outcome: Outcome.NO_OUTCOME,
      name: body.name,
      contactListId: body.contactListId,
      companyId: body.companyId,
      notes: body.notes ? body.notes : [],
      metadata: []     
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
  '^intelApproval$': {type: 'scalar', values: []},
  '^connections$': {type: 'vector-add', values: []},
  '^connections.([0-9]{1,3}).status$': {type: 'scalar', values: connectionStatus},
  '^connections.([0-9]{1,3}).outcome$': {type: 'scalar', values: connectionOutcome},
  '^connections.([0-9]{1,3}).start$': {type: 'scalar', values: []},
  '^connections.([0-9]{1,3}).end$': {type: 'scalar', values: []},
  '^notes$': {type: 'vector-add', values: []},
  '^notes.([0-9]{1,3}).__remove__$': {type: 'vector-rm', values: []},
  '^notes.([0-9]{1,3}).text$': {type: 'scalar', values: []}
};

schema.statics.validateUpdate = Shared.validateUpdate(PATH_CONTEXT, collectionName);
schema.methods.updateByPath = Shared.updateByPath(PATH_CONTEXT, collectionName);

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

ModelDef = mongoose.model('Call', schema);

module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;

