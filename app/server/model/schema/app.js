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
// var Logging = require('../../logging');

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

var Model = null;

/**
 * Schema Virtual Methods
 */
schema.virtual('details').get(function() {
  return {
    id: this._id,
    name: this.name,
    type: this.type
  };
});

/**
 * Schema Static Methods
 */

/**
 * @param {Object} body - body passed through from a POST request
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.statics.add = body => {
  return new Promise((resolve, reject) => {
    var app = new Model({
      name: body.name,
      type: body.type,
      domain: body.domain
    });

    app.save().then(res => resolve(res.details), reject);
  });
};

Model = mongoose.model('App', schema);

/**
 * Exports
 */
module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = Model;
