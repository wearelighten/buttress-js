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

/* ********************************************************************************
 *
 * LOCALS
 *
 **********************************************************************************/

let schema = new mongoose.Schema();
let ModelDef = null;

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
  _campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  _companies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  }],
  _people: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person'
  }],
  _calls: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Call'
  }],
  _emails: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Email'
  }],
  _user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: [{key: String, value: String}]
});

/*
 VIRTUALS
 */
schema.virtual('details').get(function() {
  return {
    id: this._id,
    name: this.name,
    campaignId: this._campaign && this._campaign._id ? this._campaign._id : this._campaign,
    companyIds: this._companies,
    userId: this._user
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
  if (!body.userId) {
    res.isValid = false;
    res.missing.push('user');
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
const __addContactlist = (campaign, body) => {
  return prev => {
    const cl = new ModelDef({
      name: body.name,
      _app: Model.authApp._id,
      _campaign: campaign,
      _companies: body.companyIds,
      _people: body.people,
      _user: body.userId
    });

    return cl.save()
      .then(cl => prev.concat([cl]));
  };
};

schema.statics.add = (campaign, body) => {
  if (body instanceof Array === false) {
    body = [body];
  }

  return body.reduce((promise, item) => {
    return promise
      .then(__addContactlist(campaign, item))
      .catch(Logging.Promise.logError());
  }, Promise.resolve([]));
};

schema.statics.getAll = () => {
  return ModelDef.find({});
};
schema.statics.rmAll = () => {
  return ModelDef.remove({});
};

/* ********************************************************************************
 *
 * METADATA
 *
 **********************************************************************************/

/**
 * @param {string} key - index name of the metadata
 * @param {*} value - value of the meta data
 * @return {Promise} - resolves when save operation is completed, rejects if metadata already exists
 */
schema.methods.addOrUpdateMetadata = function(key, value) {
  Logging.log(key, Logging.Constants.LogLevel.DEBUG);
  Logging.log(value, Logging.Constants.LogLevel.DEBUG);

  let exists = this.metadata.find(m => m.key === key);
  if (exists) {
    exists.value = value;
  } else {
    this.metadata.push({key: key, value: value});
  }

  return this.save().then(u => ({key: key, value: JSON.parse(value)}));
};

schema.methods.findMetadata = function(key) {
  Logging.log(`findMetadata: ${key}`, Logging.Constants.LogLevel.VERBOSE);
  Logging.log(this.metadata.map(m => ({key: m.key, value: m.value})),
    Logging.Constants.LogLevel.DEBUG);
  let md = this.metadata.find(m => m.key === key);
  return md ? {key: md.key, value: JSON.parse(md.value)} : false;
};

schema.methods.rmMetadata = function(key) {
  Logging.log(`rmMetadata: ${key}`, Logging.Constants.LogLevel.VERBOSE);

  return this
    .update({$pull: {metadata: {key: key}}})
    .then(res => res.nModified !== 0);
};

ModelDef = mongoose.model('Contactlist', schema);

/* ********************************************************************************
 *
 * EXPORTS
 *
 **********************************************************************************/
module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;

