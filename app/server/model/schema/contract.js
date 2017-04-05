'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file contract.js
 * @description Contract model definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

const mongoose = require('mongoose');
const Shared = require('../shared');
const Model = require('../');
const Logging = require('../../logging');

/* ********************************************************************************
 *
 * LOCALS
 *
 **********************************************************************************/
const schema = new mongoose.Schema();
let ModelDef = null;

/* ********************************************************************************
 *
 * CONSTANTS
 *
 **********************************************************************************/
const constants = {};

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
  DONE: status[3]
};

constants.Status = Status;

/* ********************************************************************************
 *
 * SCHEMA
 *
 **********************************************************************************/
schema.add({
  _app: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'App'
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedToId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  name: String,
  contractType: {
    type: String
  },
  contractMode: {
    type: String
  },
  entityId: String,
  entityType: String,
  references: [String],
  status: {
    type: String,
    enum: status,
    default: Status.PENDING
  },
  partyIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  }],
  dateCreated: {
    type: Date,
    default: Date.create
  },
  submittedDates: [{
    type: Date,
    default: null
  }],
  receivedDates: [{
    type: Date,
    default: null
  }],
  documentIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  executionDate: {
    type: Date,
    default: null
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
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
    ownerId: this.ownerId,
    assignedToId: this.assignedToId,
    entityId: this.entityId,
    entityType: this.entityType,
    references: this.references,
    contractType: this.contractType,
    contractMode: this.contractMode,
    status: this.status,
    partyIds: this.partyIds,
    submittedDates: this.submittedDates,
    receivedDates: this.receivedDates,
    documentIds: this.documentIds,
    executionDate: this.executionDate,
    startDate: this.startDate,
    endDate: this.endDate,
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

  if (!body.ownerId) {
    res.isValid = false;
    res.missing.push('ownerId');
  }
  if (!body.name) {
    res.isValid = false;
    res.missing.push('name');
  }
  if (!body.partyIds) {
    res.isValid = false;
    res.missing.push('partyIds');
  }
  if (!body.contractType) {
    res.isValid = false;
    res.missing.push('contractType');
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
    const cl = new ModelDef({
      _app: Model.authApp._id,
      ownerId: body.ownerId,
      name: body.name,
      contractType: body.contractType,
      contractMode: body.contractMode,
      entityId: body.entityId,
      entityType: body.entityType,
      references: body.references,
      partyIds: body.partyIds,
      submittedDates: body.submittedDates ? body.submittedDates : new Array(body.partyIds.length),
      receivedDates: body.receivedDates ? body.receivedDates : new Array(body.partyIds.length),
      executionDate: body.executionDate,
      startDate: body.startDate,
      endDate: body.endDate
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
  '^status$': {type: 'scalar', values: status},
  '^(name|contractType|contractMode|entityId|entityType|dateOfAgreement|startDate|endDate)$': {type: 'scalar', values: []},
  '^partyIds$': {type: 'vector-add', values: []},
  '^partyIds.([0-9]{1,3}).__remove__$': {type: 'vector-rm', values: []},
  '^partyIds.([0-9]{1,3})$': {type: 'scalar', values: []},
  '^documentIds$': {type: 'vector-add', values: []},
  '^documentIds.([0-9]{1,3}).__remove__$': {type: 'vector-rm', values: []},
  '^documentIds.([0-9]{1,3})$': {type: 'scalar', values: []},
  '^submittedDates$': {type: 'vector-add', values: []},
  '^submittedDates.([0-9]{1,3}).__remove__$': {type: 'vector-rm', values: []},
  '^submittedDates.([0-9]{1,3})$': {type: 'scalar', values: []},
  '^receivedDates$': {type: 'vector-add', values: []},
  '^receivedDates.([0-9]{1,3}).__remove__$': {type: 'vector-rm', values: []},
  '^receivedDates.([0-9]{1,3})$': {type: 'scalar', values: []},
  '^notes$': {type: 'vector-add', values: []},
  '^notes.([0-9]{1,3}).__remove__$': {type: 'vector-rm', values: []},
  '^notes.([0-9]{1,3}).text$': {type: 'scalar', values: []}
  '^references$': {type: 'vector-add', values: []},
  '^references.([0-9]{1,3}).__remove__$': {type: 'vector-rm', values: []},
  '^references.([0-9]{1,3}).text$': {type: 'scalar', values: []}
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
ModelDef = mongoose.model('Contract', schema);

module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
