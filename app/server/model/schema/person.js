'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file person.js
 * @description Person model definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

var mongoose = require('mongoose');
var Model = require('../model');
// var Logging = require('../../logging');

/**
 * Constants
*/

var constants = {
};

/**
 * Schema
 */
var schema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    index: true
  },
  _apps: [Model.Schema.AppAuth]
});

var ModelDef = null;

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
    var app = new ModelDef({
      name: body.name,
      type: body.type,
      domain: body.domain
    });

    app.save().then(res => resolve(res.details), reject);
  });
};

ModelDef = mongoose.model('Person', schema);

/**
 * Exports
 */
module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
