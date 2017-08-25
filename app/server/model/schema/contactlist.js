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
const Shared = require('../shared');
const Sugar = require('sugar');

/* ********************************************************************************
 *
 * LOCALS
 *
 **********************************************************************************/

let schema = new mongoose.Schema();
let ModelDef = null;
const collectionName = 'contactlists';
const collection = Model.mongoDb.collection(collectionName);

/* ********************************************************************************
 *
 * LOCALS
 *
 **********************************************************************************/

/* ********************************************************************************
 *
 * CONSTANTS
 *
 **********************************************************************************/
let constants = {};

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
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  companyIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  }],
  personIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person'
  }],
  callIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Call'
  }],
  emailIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Email'
  }],
  assignedToUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

/*
 VIRTUALS
 */
schema.virtual('details').get(function() {
  return {
    id: this._id,
    name: this.name,
    campaignId: this.campaignId,
    companyIds: this.companyIds,
    assignedToUserId: this.assignedToUserId,
    notes: this.notes.map(n => ({text: n.text, timestamp: n.timestamp, userId: n.userId}))
  };
});

/* ********************************************************************************
 *
 * STATIC METHODS
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

  if (!body.campaignId) {
    res.isValid = false;
    res.missing.push('campaign');
  }
  if (!body.companyIds && !body.personIds) {
    res.isValid = false;
    res.missing.push('data');
  }
  if (!body.assignedToUserId) {
    res.isValid = false;
    res.missing.push('user');
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
      name: body.name,
      _app: Model.authApp._id,
      campaignId: body.campaignId,
      companyIds: body.companyIds,
      personIds: body.personIds,
      assignedToUserId: body.assignedToUserId,
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
// schema.statics.addFromCampaign = (campaign, body) => {
//   body.campaignId = campaign._id;
//   return ModelDef.add(body);
// };

schema.statics.getAll = () => {
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
const PATH_CONTEXT = {
  '^companyIds$': {type: 'vector-add', values: []},
  '^assignedToUserId$': {type: 'scalar', values: []},
  '^companyIds.([0-9]{1,3})$': {type: 'scalar', values: []},
  '^companyIds.([0-9]{1,3}).(__remove__)$': {type: 'vector-rm', values: []},
  '^notes$': {type: 'vector-add', values: []},
  '^notes.([0-9]{1,3}).__remove__$': {type: 'vector-rm', values: []},
  '^notes.([0-9]{1,3}).text$': {type: 'scalar', values: []}
};

schema.statics.validateUpdate = Shared.validateUpdate(PATH_CONTEXT, collectionName);
schema.methods.updateByPath = Shared.updateByPath(PATH_CONTEXT, collectionName);

/* ********************************************************************************
 *
 * METADATA
 *
 **********************************************************************************/

schema.methods.addOrUpdateMetadata = Shared.addOrUpdateMetadata;
schema.methods.findMetadata = Shared.findMetadata;
schema.methods.rmMetadata = Shared.rmMetadata;
schema.statics.getAllMetadata = Shared.getAllMetadata(collection);

ModelDef = mongoose.model('Contactlist', schema);

/* ********************************************************************************
 *
 * EXPORTS
 *
 **********************************************************************************/
module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;

