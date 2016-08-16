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

var type = ['app'];
var Type = {
  APP: type[0]
};

var constants = {
  Type: Type
};

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
  allocated: {
    type: Boolean,
    default: false
  }
});

/**
 * Exports
 */
module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = mongoose.model('Key', schema);
