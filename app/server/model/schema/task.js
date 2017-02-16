'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file task.js
 * @description Task model definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

const mongoose = require('mongoose');
const Shared = require('../shared');
const Model = require('../');
const Logging = require('../../logging');
require('sugar');

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
  'free',
  'company',
  'campaign',
  'contact-list',
  'call',
  'appointment'
];
const Type = {
  FREE: types[0],
  COMPANY: types[1],
  CAMPAIGN: types[2],
  CONTACT_LIST: types[3],
  CALL: types[4],
  APPOINTMENT: types[5]
};

constants.Type = Type;

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
  name: String,
  taskType: {
    type: String,
    enum: types
  },
  status: {
    type: String,
    enum: status,
    default: Status.PENDING
  },
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
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  dateCreated: {
    type: Date,
    default: Date.create
  },
  dueDate: {
    type: Date,
    default: Date.create
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
    type: this.taskType,
    ownerId: this._owner && this._owner._id ? this._owner._id : this._owner,
    entityId: this.entityId,
    dueDate: this.dueDate,
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

  if (!body.ownerId) {
    res.isValid = false;
    res.missing.push('ownerId');
  }
  if (!body.name) {
    res.isValid = false;
    res.missing.push('name');
  }
  if (!body.type) {
    res.isValid = false;
    res.missing.push('type');
  }
  if (types.indexOf(body.type) === -1) {
    res.isValid = false;
    res.invalid.push('type');
  }
  if (body.type !== Type.FREE && !body.entityId) {
    res.isValid = false;
    res.missing.push('entityId');
  }
  if (!body.dueDate) {
    res.isValid = false;
    res.missing.push('dueDate');
  }
  if (Date.create(body.dueDate).isBefore(Date.create())) {
    res.isValid = false;
    res.invalid.push('dueDate');
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
      _owner: body.ownerId,
      name: body.name,
      taskType: body.type,
      entityId: body.entityId,
      dueDate: Date.create(body.dueDate)
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
  '^notes$': {type: 'vector-add', values: []},
  '^notes.([0-9]{1,3}).__remove__$': {type: 'vector-rm', values: []},
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
ModelDef = mongoose.model('Task', schema);

module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
