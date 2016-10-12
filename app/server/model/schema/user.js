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

Model.initModel('Person');
// Model.Schema.Person;

/**
 * Schema
 */
var schema = new mongoose.Schema();
schema.add({
  username: String,
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
    auth: this.auth.map(a => a.details),
    person: this.tryPerson
  };
});

schema.virtual('authenticatedMetadata').get(function() {
  if (!this.metadata) {
    return [];
  }
  return this.metadata
    .filter(m => `${m._app}` === Model.app.id)
    .map(m => ({key: m.key, value: JSON.parse(m.value)}));
});

schema.virtual('tryPerson').get(function() {
  if (!this._person) {
    return false;
  }
  return this._person.details ? this._person.details : this._person;
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

  if (Model.app.authLevel === Model.Constants.App.AuthLevel.SUPER) {
    return ModelDef.find({});
  }

  return ModelDef.find({_app: Model.app._id});
};

/**
 * @param {string} username - username to check for
 * @return {Promise} - resolves to a User object or null
 */
schema.statics.getByUsername = username => {
  return ModelDef.findOne({username: username}).select('id');
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

schema.methods.attachToPerson = function(person, details) {
  if (person !== null) {
    this._person = person;
    return this.save();
  }

  return new Promise((resolve, reject) => {
    Model.Person
      .add(details, Model.app._owner)
      .then(person => {
        Logging.log(person, Logging.Constants.LogLevel.DEBUG);
        this._person = person.id;
        return this.save();
      })
      .then(resolve, reject);
  });
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
