'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file company.js
 * @description Company model definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

const mongoose = require('mongoose');
const Model = require('../');
const Logging = require('../../logging');

const schema = new mongoose.Schema();
let ModelDef = null;
const constants = {};

/* ********************************************************************************
 *
 * EMBEDDED DEPENDENCIES
 *
 **********************************************************************************/

Model.initModel('Location');
Model.initModel('Contact');

/* ********************************************************************************
 *
 * CONSTANTS
 *
 **********************************************************************************/
const employeeBands = [
  '1-4',
  '5-9',
  '10-19',
  '20-99',
  '100-499',
  '500-999',
  '1000-1999',
  '2000-4999',
  '5000-10000',
  '>10000'
];
constants.EmployeeBands = {
  BAND_1: employeeBands[0],
  BAND_2: employeeBands[1],
  BAND_3: employeeBands[2],
  BAND_4: employeeBands[3],
  BAND_5: employeeBands[4],
  BAND_6: employeeBands[5],
  BAND_7: employeeBands[6],
  BAND_8: employeeBands[7],
  BAND_9: employeeBands[8],
  BAND_10: employeeBands[9]
};

const turnoverBands = [
  '0-99k',
  '100k-199k',
  '200k-299k',
  '300k-499k',
  '500k-999k',
  '1m-4.99m',
  '5m-10m',
  '>10m'
];
constants.TurnoverBands = {
  BAND_1: turnoverBands[0],
  BAND_2: turnoverBands[1],
  BAND_3: turnoverBands[2],
  BAND_4: turnoverBands[3],
  BAND_5: turnoverBands[4],
  BAND_6: turnoverBands[5],
  BAND_7: turnoverBands[6],
  BAND_8: turnoverBands[7]
};

/* ********************************************************************************
 *
 * SCHEMA
 *
 **********************************************************************************/
schema.add({
  name: String,
  number: Number,
  employeeBand: {
    type: String,
    enum: employeeBands
  },
  turnoverBand: {
    type: String,
    enum: turnoverBands
  },
  sector: String,
  subsector: String,
  siccode: Number,
  website: String,
  socialMedia: [{
    type: String,
    url: String
  }],
  primaryLocation: Number,
  locations: [Model.Schema.Location],
  primaryContact: Number,
  contacts: [Model.Schema.Contact],
  _app: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application'
  },
  metadata: [{key: String, value: String}]
});

/* ********************************************************************************
 *
 * SCHEMA STATIC METHODS
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
  if (!body.location) {
    res.isValid = false;
    res.missing.push('location');
  }
  if (!body.location.name) {
    res.isValid = false;
    res.missing.push('location.name');
  }
  if (!body.location.address) {
    res.isValid = false;
    res.missing.push('location.address');
  }
  if (!body.location.phoneNumber) {
    res.isValid = false;
    res.missing.push('location.phoneNumber');
  }
  if (!body.contact) {
    res.isValid = false;
    res.missing.push('contact');
  }
  if (!body.contact.name) {
    res.isValid = false;
    res.missing.push('contact.name');
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
const __addCompany = body => {
  return prev => {
    // Logging.logDebug(body);
    const loc = new Model.Location({
      name: body.location.name,
      address: Model.Address.create(body.location.address),
      phoneNumber: body.location.phoneNumber
    });

    // Logging.logDebug(loc.address.details);

    const contact = Model.Contact.create(body.contact);

    const company = new ModelDef({
      name: body.name,
      number: body.number,
      employeeBand: body.employeeBand,
      turnoverBand: body.turnoverBand,
      siccode: body.siccode,
      sector: body.sector,
      subsector: body.subsector,
      website: body.website,
      primaryLocation: 0,
      locations: [loc],
      primaryContact: 0,
      contacts: [contact],
      _app: Model.authApp._id
    });

    return company.save()
      .then(c => prev.concat([c]));
  };
};

schema.statics.add = body => {
  if (body instanceof Array === false) {
    body = [body];
  }

  return body.reduce((promise, item) => {
    return promise
      .then(__addCompany(item))
      .catch(Logging.Promise.logError());
  }, Promise.resolve([]));
};

/* ********************************************************************************
 *
 * SCHEMA VIRTUAL METHODS
 *
 *********************************************************************************/

schema.virtual('details').get(function() {
  // Logging.logDebug(this.locations[this.primaryLocation].details);
  return {
    id: this._id,
    name: this.name,
    number: this.number,
    employeeBand: this.employeeBand,
    turnoverBand: this.turnoverBand,
    sector: this.sector,
    subsector: this.subsector,
    locations: this.locations.map(l => l.details),
    contacts: this.contacts.map(c => c.details),
    primaryLocation: this.locations[this.primaryLocation].details,
    primaryContact: this.contacts[this.primaryContact].details,
    website: this.website,
    metadata: this.metadata ? this.metadata.map(m => ({key: m.key, value: JSON.parse(m.value)})) : []
  };
});

/* ********************************************************************************
 *
 * SCHEMA METHODS
 *
 **********************************************************************************/

/**
 * @param {Object} body - body passed through from a POST request
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.methods.update = function(body) {
  Logging.log(body, Logging.Constants.LogLevel.VERBOSE);

  this.name = body.name ? body.name : this.name;
  this.number = body.number ? body.number : this.number;
  this.siccode = body.siccode ? body.siccode : this.siccode;
  this.employeeBand = body.employeeBand ? body.employeeBand : this.employeeBand;
  this.turnoverBand = body.turnoverBand ? body.turnoverBand : this.turnoverBand;
  this.sector = body.sector ? body.sector : this.sector;
  this.subsector = body.subsector ? body.subsector : this.subsector;
  this.website = body.website ? body.website : this.website;

  if (body.location && this.locations[this.primaryLocation]) {
    let loc = this.locations[this.primaryLocation];
    loc.name = body.location.name ? body.location.name : loc.name;
    loc.phoneNumber = body.location.phoneNumber ? body.location.phoneNumber : loc.phoneNumber;
    if (body.location.address) {
      loc.address.update(body.location.address);
    }
  }

  return this.save();
};

/* ********************************************************************************
 *
 * SCHEMA DB FUNCTIONS
 *
 **********************************************************************************/

/*
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.statics.isDuplicate = details => {
  return Promise.resolve(false);
};

/**
 * @param {App} company - Company object to be deleted
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.statics.rm = company => {
  Logging.log(`DELETING: ${company._id}`, Logging.Constants.LogLevel.DEBUG);
  // Logging.log(org.details, Logging.Constants.LogLevel.VERBOSE);
  return ModelDef.remove({_id: company._id});
};

/**
 * @param {Array} ids - Array of company ids to delete
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.statics.rmBulk = ids => {
  Logging.log(`DELETING: ${ids}`, Logging.Constants.LogLevel.DEBUG);
  // Logging.log(org.details, Logging.Constants.LogLevel.VERBOSE);
  return ModelDef.remove({_id: {$in: ids}}).exec();
};

/*
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.statics.rmAll = () => {
  return ModelDef.remove({});
};

/**
 * @return {Promise} - resolves to an array of Companies
 */
schema.statics.findAll = () => {
  Logging.log(`findAll: ${Model.authApp._id}`, Logging.Constants.LogLevel.INFO);

  if (Model.token.authLevel === Model.Constants.Token.AuthLevel.SUPER) {
    return ModelDef.find({});
  }

  return ModelDef.find({_app: Model.authApp._id});
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

  var exists = this.metadata.find(m => m.key === key);
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
  var md = this.metadata.find(m => m.key === key);
  return md ? {key: md.key, value: JSON.parse(md.value)} : false;
};

schema.methods.rmMetadata = function(key) {
  Logging.log(`rmMetadata: ${key}`, Logging.Constants.LogLevel.VERBOSE);

  return this
    .update({$pull: {metadata: {key: key}}})
    .then(res => res.nModified !== 0);
};

/* ********************************************************************************
 *
 * EXPORTS
 *
 **********************************************************************************/
ModelDef = mongoose.model('Company', schema);

module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
