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

var mongoose = require('mongoose');

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

var constants = {
  Type: Type
};

/**
 * Schema
 */
var schema = new mongoose.Schema({
  name: String,
  type: {
    type: String,
    enum: type
  },
  domain: String,
  _token: {
    type: mongoose.Schema.Types.ObjectId,
    reg: 'Token'
  }
});

/**
 * Exports
 */
module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = mongoose.model('App', schema);
