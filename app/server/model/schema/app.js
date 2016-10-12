'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file app.js
 * @description App model definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

var fs = require('fs');
var crypto = require('crypto');
var mongoose = require('mongoose');
var Model = require('../');
var Logging = require('../../logging');
var Config = require('../../config');

/**
 * Constants
*/

var type = ['server', 'ios', 'android', 'browser'];
var Type = {
  SERVER: type[0],
  IOS: type[1],
  ANDROID: type[2],
  BROWSER: type[3]
};

var authLevel = [0, 1, 2, 3];
var AuthLevel = {
  NONE: 0,
  USER: 1,
  ADMIN: 2,
  SUPER: 3
};

var constants = {
  Type: Type,
  AuthLevel: AuthLevel,
  PUBLIC_DIR: true
};

/**
 * Schema
 */
var schema = new mongoose.Schema();
schema.add({
  name: String,
  type: {
    type: String,
    enum: type
  },
  domain: String,
  authLevel: {
    type: Number,
    enum: authLevel
  },
  permissions: [{route: String, permission: String}],
  metadata: [{key: String, value: String}],
  _owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  _token: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Token'
  }
});

var ModelDef = null;
Model.initModel('Token');
Model.initModel('Group');

/**
 * Schema Virtual Methods
 */
schema.virtual('details').get(function() {
  return {
    id: this._id,
    name: this.name,
    type: this.type,
    authLevel: this.authLevel,
    owner: this.ownerDetails,
    token: this.tokenValue,
    publicUid: this.getPublicUID(),
    metadata: this.metadata.map(m => ({key: m.key, value: JSON.parse(m.value)})),
    permissions: this.permissions.map(p => {
      return {route: p.route, permission: p.permission};
    })
  };
});

schema.virtual('ownerDetails').get(function() {
  if (!this._owner) {
    return false;
  }
  if (!this._owner.details) {
    return this._owner;
  }
  return this._owner.details;
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
 * Schema Methods
 */

schema.methods.setOwner = function(group) {
  this._owner = group;
  return this.save();
};

/**
 * Schema Static Methods
 */

/**
 * @param {Object} body - body passed through from a POST request
 * @return {Promise} - fulfilled with App Object when the database request is completed
 */
schema.statics.add = body => {
  Logging.log(body, Logging.Constants.LogLevel.DEBUG);

  var app = new ModelDef({
    name: body.name,
    type: body.type,
    authLevel: body.authLevel,
    permissions: body.permissions,
    domain: body.domain,
    _owner: body.ownerGroupId
  });

  var _token = false;
  return Model.Token
    .add(Model.Constants.Token.Type.APP)
    .then(token => {
      _token = token;
      Logging.log(token.value, Logging.Constants.LogLevel.DEBUG);
      app._token = token.id;
      return app.save();
    })
    .then(app => {
      return Promise.resolve({app: app, token: _token});
    });
};

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
    this.metadata.push({key, value});
  }

  return this.save();
};

schema.methods.findMetadata = function(key) {
  Logging.log(`findMetadata: ${key}`, Logging.Constants.LogLevel.VERBOSE);
  // Logging.log(this.metadata, Logging.Constants.LogLevel.DEBUG);
  var md = this.metadata.find(m => m.key === key);
  return md ? {key: md.key, value: JSON.parse(md.value)} : undefined;
};

/**
 * @param {string} route - route for the permission
 * @param {*} permission - permission to apply to the route
 * @return {Promise} - resolves when save operation is completed, rejects if metadata already exists
 */
schema.methods.addOrUpdatePermission = function(route, permission) {
  Logging.log(route, Logging.Constants.LogLevel.DEBUG);
  Logging.log(permission, Logging.Constants.LogLevel.DEBUG);

  var exists = this.permissions.find(p => p.route === route);
  if (exists) {
    exists.permission = permission;
  } else {
    this.permissions.push({route, permission});
  }

  return this.save();
};

/**
 * @param {String} name - name of the data folder to create
 * @param {Boolean} isPublic - true for /public (which is available via the static middleware) otherwise /private
 * @return {String} - UID
 */
schema.methods.mkDataDir = function(name, isPublic) {
  var uid = Model.app.getPublicUID();
  var baseName = `${Config.appDataPath}/${isPublic ? 'public' : 'private'}/${uid}`;

  return new Promise((resolve, reject) => {
    fs.mkdir(baseName, err => {
      if (err && err.code !== 'EEXIST') {
        reject(err);
        return;
      }
      var dirName = `${baseName}/${name}`;
      fs.mkdir(dirName, err => {
        if (err && err.code !== 'EEXIST') {
          reject(err);
          return;
        }
        resolve();
      });
    });
  });
};

/**
 * @return {String} - UID
 */
schema.methods.getPublicUID = function() {
  var hash = crypto.createHash('sha512');
  // Logging.log(`Create UID From: ${this.name}.${this.tokenValue}`, Logging.Constants.LogLevel.DEBUG);
  hash.update(`${this.name}.${this.tokenValue}`);
  var bytes = hash.digest();

  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var mask = 0x3d;
  var uid = '';

  for (var byte = 0; byte < 32; byte++) {
    uid += chars[bytes[byte] & mask];
  }

  Logging.log(`Got UID: ${uid}`, Logging.Constants.LogLevel.SILLY);
  return uid;
};

/**
 * @param {App} app - App object to be deleted
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.statics.rm = app => {
  // Logging.log(app.details);
  return new Promise((resolve, reject) => {
    Model.Token.remove({_id: app._token})
      .then(() => ModelDef.remove({_id: app._id}))
      .then(resolve, reject);
  });
};

/**
 * @return {Promise} - resolves to an array of Apps (App.details)
 */
schema.statics.findAll = () => {
  return new Promise((resolve, reject) => {
    ModelDef.find({}).populate('_token').populate('_owner')
      .then(Logging.Promise.logArrayProp('App', '_token', Logging.Constants.LogLevel.DEBUG))
      .then(res => resolve(res.map(d => Object.assign(d.details, {token: d._token.value}))), reject);
      // .then(Logging.Promise.logArrayProp('tokens', '_token', Logging.Constants.LogLevel.DEBUG))
      // .then(res => resolve(res.map(d => d.details)), reject);
  });
};

/**
 * @return {Promise} - resolves to an array of Apps (native Mongoose objects)
 */
schema.statics.findAllNative = () => {
  return new Promise((resolve, reject) => {
    ModelDef.find({}).populate('_token')
      .then(Logging.Promise.logArrayProp('App', '_token', Logging.Constants.LogLevel.VERBOSE))
      .then(resolve, reject);
      // .then(Logging.Promise.logArrayProp('tokens', '_token'))
      // .then(res => resolve(res.map(d => d.details)), reject);
  });
};

ModelDef = mongoose.model('App', schema);

/**
 * Exports
 */
module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
