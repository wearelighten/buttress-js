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
  website: String
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
  var org = new ModelDef({
    name: body.name,
    type: body.type,
    images: {
      avatar: body.avatarUrl,
      banner: body.bannerUrl
    },
    website: body.website
  });

  return org.save();
};

/**
 * @param {App} org - Organisation object to be deleted
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.statics.rm = org => {
  Logging.log('DELETING', Logging.Constants.LogLevel.VERBOSE);
  Logging.log(org.details, Logging.Constants.LogLevel.VERBOSE);
  return ModelDef.remove({_id: org._id});
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
  return new Promise((resolve, reject) => {
    ModelDef.find({})
      .then(res => resolve(res.map(d => d.details)), reject);
    // .then(Logging.Promise.logArrayProp('tokens', '_token'))
    // .then(res => resolve(res.map(d => d.details)), reject);
  });
};

ModelDef = mongoose.model('Organisation', schema);

/**
 * Exports
 */
module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
