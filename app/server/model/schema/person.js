'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file person.js
 * @description Person model definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

const mongoose = require('mongoose');
const humanname = require('humanname');
const Model = require('../../model');
const Logging = require('../../logging');

/**
 * Constants
*/

var constants = {
};

/**
 * Schema
 */
var schema = new mongoose.Schema({
  title: String,
  forename: String,
  initials: String,
  surname: String,
  suffix: String,
  emails: [String],
  address: String,
  postcode: String,
  phone: {
    landline: String,
    mobile: String
  },
  membershipNumber: String,
  voterId: String,
  metadata: [{
    _app: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application'
    },
    key: String,
    value: String
  }],
  _dataOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }
});

var ModelDef = null;

/**
 * Schema Virtual Methods
 */
schema.virtual('details').get(function() {
  var formalName =
    `${this.title ? this.title + ' ' : ''}${this.forename} ${this.initials ? this.initials + ' ' : ''}${this.surname}`;

  return {
    id: this._id,
    title: this.title,
    forename: this.forename,
    initials: this.initials,
    surname: this.surname,
    formalName: formalName,
    name: `${this.forename} ${this.surname}`,
    address: this.address,
    postcode: this.postcode,
    phone: {
      landline: this.landline,
      mobile: this.mobile
    },
    membershipNumber: this.membershipNumber,
    voterId: this.voterId,
    dataOwner: this.tryOwner,
    metadata: this.authenticatedMetadata
  };
});

schema.virtual('authenticatedMetadata').get(function() {
  return this.metadata
    .filter(m => `${m._app}` === Model.app.id)
    .map(m => ({key: m.key, value: JSON.parse(m.value)}));
});

schema.virtual('tryOwner').get(function() {
  if (!this._dataOwner) {
    return false;
  }
  return this._dataOwner.details ? this._dataOwner.details : this._dataOwner;
});

/**
 * Schema Static Methods
 */

/**
 * @param {Object} body - person details
 * @param {Object} owner - Owner group Mongoose object
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.statics.add = (body, owner) => {
  var name = humanname.parse(body.name);

  return new Promise((resolve, reject) => {
    var app = new ModelDef({
      title: name.salutation,
      forename: name.firstName,
      initials: name.initials,
      surname: name.lastName,
      suffix: name.suffix,
      emails: [body.email],
      telephone: {
        landline: body.landline,
        mobile: body.mobile
      },
      address: body.address,
      postcode: body.postcode,
      membershipNumber: body.membershipNumber,
      voterId: body.voterId,
      _dataOwner: owner
    });

    app.save().then(res => resolve(res.details), reject);
  });
};

/**
 * @return {Promise} - resolves to an array of Apps (App.details)
 */
schema.statics.findAll = () => {
  return ModelDef
    .find({}).populate('_owner')
    .then(res => res.map(p => p.details));
};

/**
 * @param {Object} details - currently requires 'email' only
 * @return {Promise} - resolves to a person matching details or null if not found
 */
schema.statics.findByDetails = details => {
  if (!details.email) {
    return Promise.reject(new Error('missing_required_field_email'));
  }
  return ModelDef.findOne({emails: details.email});
};

/**
 * @return {Promise} - resolves once all have been deleted
 */
schema.statics.rmAll = () => {
  return ModelDef.remove({});
};

/**
 * Schema Methods
 */

/**
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.methods.rm = function() {
  return ModelDef.remove({_id: this._id});
};

/**
 * @param {string} key - index name of the metadata
 * @param {*} value - value of the meta data
 * @return {Promise} - resolves when save operation is completed, rejects if metadata already exists
 */
schema.methods.addOrUpdateMetadata = function(key, value) {
  Logging.log(`${Model.app.id}`, Logging.Constants.LogLevel.DEBUG);
  Logging.log(key, Logging.Constants.LogLevel.DEBUG);
  Logging.log(value, Logging.Constants.LogLevel.DEBUG);

  var exists = this.metadata.find(m => `${m._app}` === Model.app.id && m.key === key);
  if (exists) {
    exists.value = value;
  } else {
    this.metadata.push({_app: Model.app, key: key, value: value});
  }

  return this.save().then(u => ({key: key, value: JSON.parse(value)}));
};

schema.methods.findMetadata = function(key) {
  Logging.log(`findMetadata: ${key}`, Logging.Constants.LogLevel.VERBOSE);
  Logging.log(this.metadata.map(m => ({app: `${m._app}`, key: m.key, value: m.value})),
    Logging.Constants.LogLevel.DEBUG);
  var md = this.metadata.find(m => `${m._app}` === Model.app.id && m.key === key);
  return md ? {key: md.key, value: JSON.parse(md.value)} : false;
};

schema.methods.rmMetadata = function(key) {
  Logging.log(`rmMetadata: ${key}`, Logging.Constants.LogLevel.VERBOSE);
  // Logging.log(this.metadata.map(m => ({app: `${m._app}`, key: m.key, value: m.value})),
  //   Logging.Constants.LogLevel.DEBUG);
  // var md = this.metadata.find(m => `${m._app}` === Model.app.id && m.key === key);
  // Logging.log(md.id, Logging.Constants.LogLevel.DEBUG);

  return this
    .update({$pull: {metadata: {_app: Model.app.id, key: key}}})
    .then(Logging.Promise.log('removeMetadata'))
    .then(res => res.nModified !== 0);
};

ModelDef = mongoose.model('Person', schema);

/**
 * Exports
 */
module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
