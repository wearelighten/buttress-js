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
const ObjectId = require('mongodb').ObjectId;
const Shared = require('../shared');
const Model = require('../');
const Logging = require('../../logging');
const Sugar = require('sugar');

/* ********************************************************************************
 *
 * LOCALS
 *
 **********************************************************************************/
const schema = new mongoose.Schema();
let ModelDef = null;
const collectionName = 'contracts';
const collection = Model.mongoDb.collection(collectionName);

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
  assignedToUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  name: String,
  tag: String,
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
  approval: {
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
  parties: [{
    partyType: String,
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company'
    },
    submitted: {
      type: Date,
      default: null
    },
    received: {
      type: Date,
      default: null
    }
  }],
  dateCreated: {
    type: Date,
    default: Sugar.Date.create
  },
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
    tag: this.tag,
    ownerId: this.ownerId,
    assignedToUserId: this.assignedToUserId,
    entityId: this.entityId,
    entityType: this.entityType,
    references: this.references,
    contractType: this.contractType,
    contractMode: this.contractMode,
    status: this.status,
    approval: this.approval,
    parties: this.parties,
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
  if (!body.parties) {
    res.isValid = false;
    res.missing.push('parties');
  }
  if (!body.contractType) {
    res.isValid = false;
    res.missing.push('contractType');
  }

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
    const md = {
      _app: Model.authApp._id,
      ownerId: body.ownerId,
      assignedToUserId: body.assignedToUserId,
      name: body.name,
      tag: body.tag,
      status: Status.PENDING,
      contractType: body.contractType,
      contractMode: body.contractMode,
      entityId: body.entityId,
      entityType: body.entityType,
      references: body.references,
      parties: body.parties,
      documentIds: body.documentIds,
      executionDate: body.executionDate,
      startDate: body.startDate,
      endDate: body.endDate,
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
  Logging.logSilly(`getAll: ${Model.authApp._id}`);
  return collection.find({_app: Model.authApp._id}, {metadata: 0});
};

/**
 * @param {Array} ids - Array of company ids to delete
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.statics.rmBulk = ids => {
  Logging.logSilly(`DELETING: ${ids}`);
  return ModelDef.remove({_id: {$in: ids}}).exec();
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
  '^(name|tag|contractType|contractMode|assignedToUserId|entityId|entityType|dateOfAgreement|startDate|endDate)$': {type: 'scalar', values: []},
  '^approval$': {type: 'scalar', values: []},
  '^parties$': {type: 'vector-add', values: []},
  '^parties.([0-9]{1,3}).__remove__$': {type: 'vector-rm', values: []},
  '^parties.([0-9]{1,3}).(submitted|received)$': {type: 'scalar', values: []},
  '^documentIds$': {type: 'vector-add', values: []},
  '^documentIds.([0-9]{1,3}).__remove__$': {type: 'vector-rm', values: []},
  '^documentIds.([0-9]{1,3})$': {type: 'scalar', values: []},
  '^notes$': {type: 'vector-add', values: []},
  '^notes.([0-9]{1,3}).__remove__$': {type: 'vector-rm', values: []},
  '^notes.([0-9]{1,3}).text$': {type: 'scalar', values: []},
  '^references$': {type: 'vector-add', values: []},
  '^references.([0-9]{1,3}).__remove__$': {type: 'vector-rm', values: []},
  '^references.([0-9]{1,3})$': {type: 'scalar', values: []}
};

schema.statics.validateUpdate = Shared.validateUpdate(PATH_CONTEXT, collectionName);
schema.methods.updateByPath = Shared.updateByPath(PATH_CONTEXT, collectionName);

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
ModelDef = mongoose.model('Contract', schema);

module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
