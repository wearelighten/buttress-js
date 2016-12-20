'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file activity.js
 * @description Activity model definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */
const mongoose = require('mongoose');
const Model = require('../');
const Logging = require('../../logging');
const Helpers = require('../../helpers');
// var Config = require('../../config');

/**
 * Constants
 */

const visibility = ['public', 'private'];
const Visibility = {
  PUBLIC: visibility[0],
  PRIVATE: visibility[1]
};

const constants = {
  Visibility: Visibility
};

/**
 * Schema
 */
const schema = new mongoose.Schema();
schema.add({
  timestamp: {
    type: Date,
    default: Date.create
  },
  title: String,
  description: String,
  visibility: {
    type: String,
    enum: visibility
  },
  path: String,
  authLevel: Number,
  permissions: String,
  params: Object,
  query: Object,
  body: Object,
  response: Object,
  metadata: [{key: String, value: String}],
  _token: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Token'
  },
  _app: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application'
  },
  _user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

let ModelDef = null;

/**
 * Schema Virtual Methods
 */
schema.virtual('details').get(function() {
  return {
    id: this._id,
    timestamp: this.timestamp,
    title: this.title,
    description: this.description,
    visibility: this.visibility,
    path: this.path,
    permissions: this.permissions,
    user: this._user,
    metadata: this.metadata.map(m => ({key: m.key, value: JSON.parse(m.value)}))
  };
});

schema.virtual('tokenValue').get(function() {
  if (!this._token) {
    return false;
  }
  if (!this._token.value) {
    return this._token;
  }
  return this._token.value;
});

/**
 * Schema Static Methods
 */

/**
 * @param {Object} route - route object that fulfilled the request
 * @param {Object} response - object containing the response data
 * @return {Promise} - fulfilled with App Object when the database request is completed
 */
schema.statics.add = (route, response) => {
  Logging.log(route.path, Logging.Constants.LogLevel.DEBUG);

  const app = new ModelDef({
    title: route.activityTitle,
    description: route.activityDescription,
    visibility: route.activityVisibility,
    authLevel: route.authLevel,
    permissions: route.permissions,
    params: route.req.params,
    query: route.req.query,
    body: route.req.body,
    response: response,
    _token: Model.token.id,
    _user: Model.authUser,
    _app: Model.authApp
  });

  return app.save();
};

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
    this.metadata.push({key, value});
  }

  return this.save();
};

schema.methods.findMetadata = function(key) {
  Logging.log(`findMetadata: ${key}`, Logging.Constants.LogLevel.VERBOSE);
  // Logging.log(this.metadata, Logging.Constants.LogLevel.DEBUG);
  let md = this.metadata.find(m => m.key === key);
  return md ? {key: md.key, value: JSON.parse(md.value)} : undefined;
};

/**
 * @return {Promise} - resolves to an array of Apps (native Mongoose objects)
 */
schema.statics.findAll = () => {
  Logging.log(`findAll: ${Model.authApp._id}`, Logging.Constants.LogLevel.INFO);

  if (Model.token.authLevel === Model.Constants.Token.AuthLevel.SUPER) {
    return ModelDef.find({});
  }

  return ModelDef.find({_app: Model.authApp._id, visibility: constants.Visibility.PUBLIC})
    .then(Helpers.Promise.arrayProp('details'));
};

ModelDef = mongoose.model('Activity', schema);

/**
 * Exports
 */
module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
