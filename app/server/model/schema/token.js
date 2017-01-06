'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file token.js
 * @description Token definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

var crypto = require('crypto');
var mongoose = require('mongoose');
var Logging = require('../../logging');
var Model = require('../');

/**
 * Constants
 */

var type = ['app', 'user'];
var Type = {
  APP: type[0],
  USER: type[1]
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
  AuthLevel: AuthLevel
};

/**
 * @return {string} - cryptographically secure token string
 * @private
 */
var _createTokenString = () => {
  const length = 36;
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var mask = 0x3d;
  var string = '';

  try {
    var bytes = crypto.randomBytes(length);
    for (var x = 0; x < bytes.length; x++) {
      var byte = bytes[x];
      string += chars[byte & mask];
    }
  } catch (err) {
    throw err;
  }

  Logging.log(`Created Token: ${string}`, Logging.Constants.LogLevel.VERBOSE);

  return string;
};

var ModelDef = null;
Model.initModel('App');
Model.initModel('User');

/**
 * Schema
 */
var schema = new mongoose.Schema({
  type: {
    type: String,
    enum: type
  },
  value: {
    type: String,
    index: {
      unique: true
    }
  },
  _app: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'App'
  },
  _user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  domains: [String],
  authLevel: {
    type: Number,
    enum: authLevel
  },
  permissions: [{
    route: String,
    permission: String
  }],
  uses: [Date],
  allocated: {
    type: Boolean,
    default: false
  }
});

/**
 * Schema Virtual Methods
 */
schema.virtual('details').get(function() {
  return {
    id: this._id,
    type: this.type,
    app: this.app,
    user: this.user,
    authLevel: this.authLevel,
    domains: this.domains,
    permissions: this.permissions.map(p => {
      return {route: p.route, permission: p.permission};
    })
  };
});

schema.virtual('app').get(function() {
  if (!this._app) {
    return null;
  }
  if (!this._app.details) {
    return this._app;
  }
  return this._app.details;
});

schema.virtual('user').get(function() {
  if (!this._user) {
    return null;
  }
  if (!this._user.details) {
    return this._user;
  }
  return this._user.details;
});

/**
 * Schema Static Methods
 */

/**
 * @param {Object} details - type, app, user, authLevel, permissions
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.statics.add = details => {
  Logging.logDebug(`Add User Token: ${details.user ? details.user._id : false}`);

  var token = new ModelDef({
    type: details.type,
    value: _createTokenString(),
    _app: details.app,
    _user: details.user,
    domains: details.domains,
    authLevel: details.authLevel,
    permissions: details.permissions,
    allocated: true
  });

  return token.save();
};

/**
 * Schema Methods
 */

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
 * Schema Static Methods
 */

/**
 * @return {Promise} - resolves to an array of Tokens (native Mongoose objects)
 */
schema.statics.findAllNative = () => {
  return ModelDef.find({allocated: true}).populate('_app').populate({path: '_user', populate: {path: '_person'}});
};

/**
 * @param {String} userId - DB id for the user
 * @param {String} appId - DB id for the app
 * @return {Promise} - resolves to an array of Tokens (native Mongoose objects)
 */
schema.statics.findUserAuthToken = (userId, appId) => {
  return ModelDef.findOne({allocated: true, _app: appId, _user: userId});
};

/**
 * @param {Enum} type - OPTIONAL 'app' or 'user'
 * @return {Promise} - resolves when done
 */
schema.statics.rmAll = type => {
  return ModelDef.remove({type: type}).then(r => true);
};

ModelDef = mongoose.model('Token', schema);

/**
 * Exports
 */
module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
