'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file user.js
 * @description User model definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

var mongoose = require('mongoose');
var Model = require('../');
var Logging = require('../../logging');

/**
 * Constants
*/

var constants = {
};

// Logging.log(Model.initModel('Appauth'));
// Logging.log(Model.Schema.Appauth);

/**
 * Schema
 */
var schema = new mongoose.Schema();
schema.add({
  username: {
    type: String,
    index: true
  },
  metadata: [{
    _app: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application'
    },
    key: String,
    value: String
  }],
  _apps: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application'
  }],
  _person: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person'
  },
  auth: [Model.Schema.Appauth]
});

var ModelDef = null;

/**
 * Schema Virtual Methods
 */
schema.virtual('details').get(function() {
  return {
    id: this._id,
    username: this.username,
    metadata: this.authenticatedMetadata,
    auth: this.auth.map(a => a.details)
  };
});

schema.virtual('appName').get(function() {
  if (!this._app) {
    return false;
  }
  if (!this._app.name) {
    return this._app;
  }
  return this._app.name;
});

schema.virtual('authenticatedMetadata').get(function() {
  return this.metadata
    .filter(m => `${m._app}` === Model.app.id)
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
    username: body.username,
    _apps: [Model.app]
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

/**
 * @param {ObjectId} appId - id of the App that owns the user
 * @return {Promise} - resolves to an array of Apps (native Mongoose objects)
 */
schema.statics.getAll = () => {
  Logging.log(`getAll: ${Model.app._id}`, Logging.Constants.LogLevel.INFO);
  return ModelDef.find({_app: Model.app._id});
};

/**
 * @param {string} appName - Name of the authenticating App (facebook|twitter|google) that owns the user
 * @param {string} appUserId - AppId of the user
 * @return {Promise} - resolves to an array of Apps (native Mongoose objects)
 */
schema.statics.getByAppId = (appName, appUserId) => {
  Logging.log(`getByAppId: ${appName} - ${appUserId}`, Logging.Constants.LogLevel.VERBOSE);

  return ModelDef.findOne({'auth.app': appName, 'auth.appId': appUserId}).select('id');
};

/**
 * @param {string} app - name of the app for which the token is being updated
 * @param {Object} body - body passed through from a PUT request
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.methods.updateToken = function(app, body) {
  var auth = this.auth.find(a => a.app === app);
  if (!auth) {
    Logging.log(`Unable to find Appauth for ${app}`, Logging.Constants.LogLevel.DEBUG);
    return Promise.resolve(false);
  }

  Logging.log(`Old Token: ${auth.token}`, Logging.Constants.LogLevel.DEBUG);
  Logging.log(`Old Token Secret: ${auth.tokenSecret}`, Logging.Constants.LogLevel.DEBUG);
  Logging.log(`New Token: ${body.token}`, Logging.Constants.LogLevel.DEBUG);
  Logging.log(`New Token Secret: ${body.tokenSecret}`, Logging.Constants.LogLevel.DEBUG);

  auth.token = body.token;
  auth.tokenSecret = body.tokenSecret;

  return this.save().then(() => true);
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

ModelDef = mongoose.model('User', schema);

/**
 * Exports
 */
module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
