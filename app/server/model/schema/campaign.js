'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file campaign.js
 * @description Campaign definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

const mongoose = require('mongoose');
const Model = require('../');
const Logging = require('../../logging');

/**
 * Constants
 */

var constants = {
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
  _app: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'App'
  },
  images: [{label: String, pathname: String}],
  templates: [{label: String, markup: String}],
  metadata: [{key: String, value: String}]
});

var ModelDef = null;

/*
  VIRTUALS
 */
schema.virtual('details').get(function() {
  return {
    id: this._id,
    username: this.username,
    metadata: this._metadata,
    auth: this.auth.map(a => a.details)
  };
});

schema.virtual('_metadata').get(function() {
  return this.metadata
    .map(m => ({key: m.key, value: JSON.parse(m.value)}));
});

/**
 * Schema Static Methods
 */

/**
 * @param {Object} body - body passed through from a POST request
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.statics.add = body => {
  var user = new ModelDef({
    name: body.name,
    _app: Model.app
  });

  user.auth.push(new Model.Appauth({
    app: body.app,
    appId: body.id,
    username: body.username,
    profileUrl: body.profileUrl,
    images: {
      profile: body.profileImgUrl,
      banner: body.bannerImgUrl
    },
    email: body.email,
    token: body.token,
    tokenSecret: body.tokenSecret
  }));

  // Logging.log(body);
  Logging.log(user.auth[0].username, Logging.Constants.LogLevel.DEBUG);
  Logging.log(user.auth[0].app, Logging.Constants.LogLevel.DEBUG);
  Logging.log(user.auth[0].appId, Logging.Constants.LogLevel.DEBUG);

  return user.save();
};

schema.methods.addImage = function(imgData, encoding) {
  encoding = encoding || 'base64';
}

/**
 * @param {string} key - index name of the metadata
 * @param {*} value - value of the meta data
 * @return {Promise} - resolves when save operation is completed, rejects if metadata already exists
 */
schema.methods.addOrUpdateMetadata = function(key, value) {
  Logging.log(`${Model.app.id}`, Logging.Constants.LogLevel.DEBUG);
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

/**
 * @type {{constants: {}, schema: {}, model: {}}}
 */
module.exports = {
  constants: constants,
  schema: schema,
  model: ModelDef
};
