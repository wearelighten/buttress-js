'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file organisation.js
 * @description Organisation model definition.
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
var type = ['company', 'charity', 'education', 'political'];
var Type = {
  COMPANY: type[0],
  CHARITY: type[1],
  EDUCATION: type[2],
  POLITICAL: type[3]
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
  images: {
    avatar: String,
    banner: String
  },
  website: String,
  _app: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application'
  }
});

var ModelDef = null;

/**
 * Schema Virtual Methods
 */
schema.virtual('details').get(function() {
  return {
    id: this._id,
    name: this.name,
    type: this.type,
    website: this.website,
    images: this.images
  };
});

/**
 * Schema Methods
 */

schema.methods.findGroups = () => {
  Logging.log(`OrgId: ${this.id}`, Logging.Constants.LogLevel.INFO);
  return Model.Group.find({_organisation: this.id});
};

/**
 * Schema Static Methods
 */

/**
 * @param {Object} body - body passed through from a POST request
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.statics.add = body => {
  Logging.log(body, Logging.Constants.LogLevel.VERBOSE);
  let org = new ModelDef({
    name: body.name,
    type: body.type,
    images: {
      avatar: body.avatarUrl,
      banner: body.bannerUrl
    },
    website: body.website,
    _app: Model.authApp ? Model.authApp._id : null
  });

  return org.save();
};

/**
 * @param {App} org - Organisation object to be deleted
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.statics.rm = org => {
  // Logging.log('DELETING', Logging.Constants.LogLevel.VERBOSE);
  // Logging.log(org.details, Logging.Constants.LogLevel.VERBOSE);
  return ModelDef.remove({_id: org._id});
};

/**
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.statics.rmAll = () => {
  return ModelDef.remove({});
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
schema.statics.findAll = () => {
  Logging.log(`findAll: ${Model.authApp._id}`, Logging.Constants.LogLevel.INFO);

  if (Model.token.authLevel === Model.Constants.Token.AuthLevel.SUPER) {
    return ModelDef.find({});
  }

  return ModelDef.find({_app: Model.authApp._id});
};

/**
 * @param {ObjectId} appId - id of the App that owns the user
 * @return {Promise} - resolves to an array of Apps (native Mongoose objects)
 */
schema.statics.getAll = () => {
  Logging.log(`getAll: ${Model.authApp._id}`, Logging.Constants.LogLevel.INFO);

  if (Model.token.authLevel === Model.Constants.Token.AuthLevel.SUPER) {
    return ModelDef.find({});
  }

  return ModelDef.find({_app: Model.authApp._id});
};

/**
 * Methods
 */

/**
 * @param {Object} body - body passed through from a POST request
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.methods.update = function(body) {
  Logging.log(body, Logging.Constants.LogLevel.VERBOSE);

  this.name = body.name ? body.name : this.name;
  this.type = body.type ? body.type : this.type;
  this.website = body.website ? body.website : this.website;

  return this.save();
};

ModelDef = mongoose.model('Organisation', schema);

/**
 * Exports
 */
module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
