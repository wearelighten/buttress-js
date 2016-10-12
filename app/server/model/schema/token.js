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
// var Model = require('../model');

/**
 * Constants
 */

var type = ['app', 'user'];
var Type = {
  APP: type[0],
  USER: type[1]
};

var constants = {
  Type: Type
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
  uses: [Date],
  allocated: {
    type: Boolean,
    default: false
  }
});

/**
 * Schema Static Methods
 */

/**
 * @param {enum} type - type of token to create
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.statics.add = type => {
  var app = new ModelDef({
    type: type,
    value: _createTokenString(),
    allocated: true
  });

  return app.save();
};

ModelDef = mongoose.model('Token', schema);

/**
 * Exports
 */
module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
