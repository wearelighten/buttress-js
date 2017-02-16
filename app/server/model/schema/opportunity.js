'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file opportunity.js
 * @description Opportunity model definition.
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
 * CONSTANTS
 *
 **********************************************************************************/
let constants = {};
const types = [
  'new-business',
  'renewal'
];
const Type = {
  NEW_BUSINESS: types[0],
  RENEWAL: types[1]
};

constants.Type = Type;

const statuses = [
  'pending',
  'in-progress',
  'deferred',
  'lost',
  'won'
];
const Status = {
  PENDING: statuses[0],
  IN_PROGRESS: statuses[1],
  DEFERRED: statuses[2],
  LOST: statuses[3],
  WON: statuses[4]
};

constants.Status = Status;

const qualification = [
  'unqualified',
  'qualified-weak',
  'qualified-strong'
];
const Qualification = {
  UNQUALIFIED: qualification[0],
  QUALIFIED_WEAK: qualification[1],
  QUALIFIED_STRONG: qualification[2],
  DEAD: statuses[3],
  WON: statuses[4]
};

constants.Qualification = Qualification;

/* ********************************************************************************
 *
 * SCHEMA
 *
 **********************************************************************************/
schema.add({
  name: String,
  opportunityType: {
    type: String,
    enum: types
  },
  status: {
    type: String,
    enum: statuses
  },
  qualification: {
    type: String,
    enum: qualification
  },
  _app: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'App'
  },
  _company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  _owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  _assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  relatedEntity: {
    entityType: {
      type: String
    },
    id: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  value: {
    type: Number,
    default: 0
  },
  confidence: {
    type: Number,
    default: 0
  },
  dates: {
    opened: {
      type: Date,
      default: Date.create
    },
    updated: [Date],
    closed: {
      type: Date
    }
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
    type: this.opportunityType,
    userId: this._user && this._user._id ? this._user._id : this._user,
    entityId: this.entityId,
    dateCreated: this.dateCreated,
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

  if (!body.name) {
    res.isValid = false;
    res.missing.push('name');
  }
  if (!body.userId) {
    res.isValid = false;
    res.missing.push('userId');
  }
  if (!body.type) {
    res.isValid = false;
    res.missing.push('type');
  }
  if (types.indexOf(body.type) === -1) {
    res.isValid = false;
    res.invalid.push('type');
  }
  if (body.type !== Type.CHAT && !body.entityId) {
    res.isValid = false;
    res.missing.push('entityId');
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
      name: body.name,
      _user: body.userId,
      type: body.type,
      entityId: body.entityId
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

ModelDef = mongoose.model('Opportunity', schema);

module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
