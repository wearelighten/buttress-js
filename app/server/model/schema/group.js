'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file group.js
 * @description Group model definition. Groups are subsets of organisations.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

var mongoose = require('mongoose');
var Logging = require('../../logging');
var Model = require('../');

/**
 * Constants
*/
var type = ['volunteers', 'staff', 'meta'];
var Type = {
  VOLUNTEERS: type[0],
  STAFF: type[1],
  META: type[2]
};

var constants = {
  Type: Type
};

/**
 * Schema
 */
var schema = new mongoose.Schema();
schema.add({
  name: {
    type: String,
    index: true
  },
  type: {
    type: String,
    enum: type
  },
  website: String,
  _organisation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation'
  },
  _app: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application'
  }
});

var ModelDef = null;
Model.initModel('Organisation');

/**
 * Schema Virtual Methods
 */
schema.virtual('details').get(function() {
  return {
    id: this._id,
    name: this.name,
    type: this.type,
    organisation: this.organisationName,
    images: {
      avatar: String,
      banner: String
    },
    website: this.website
  };
});

schema.virtual('organisationName').get(function() {
  if (!this._organisation) {
    return false;
  }
  if (!this._organisation.name) {
    return this._organisation;
  }
  return this._organisation.name;
});

/**
 * Schema Static Methods
 */

/**
 * @param {Object} body - body passed through from a POST request
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.statics.add = body => {
  Logging.log(body, Logging.Constants.LogLevel.VERBOSE);
  var app = new ModelDef({
    name: body.name,
    type: body.type,
    website: body.website,
    images: {
      avatar: body.avatarUrl,
      banner: body.bannerUrl
    },
    _organisation: body.orgId,
    _app: Model.authApp ? Model.authApp._id : null
  });

  return app.save();
};

/**
 * @param {App} group - Group object to be deleted
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.statics.rm = group => {
  Logging.log(group.details, Logging.Constants.LogLevel.VERBOSE);
  return ModelDef.remove({_id: group._id});
};

/**
 * @param {string} name - name of the group
 * @return {Promise} - resolves to boolean
 */
schema.statics.isDuplicate = name => {
  return new Promise((resolve, reject) => {
    ModelDef.find({name: name})
      .then(res => resolve(res.length > 0), reject);
  });
};

/**
 * @return {Promise} - resolves to an array of Organisations (Organisation.details)
 */
/**
 * @return {Promise} - resolves to an array of Organisations (Organisation.details)
 */
schema.statics.findAll = () => {
  Logging.log(`findAll: ${Model.authApp._id}`, Logging.Constants.LogLevel.INFO);

  if (Model.token.authLevel === Model.Constants.Token.AuthLevel.SUPER) {
    return ModelDef.find({});
  }

  return ModelDef.find({_app: Model.authApp._id});
};

ModelDef = mongoose.model('Group', schema);

/**
 * Exports
 */
module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
