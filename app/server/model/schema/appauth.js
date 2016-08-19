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
var Model = require('../model');
// var Logging = require('../../logging');

/**
 * Constants
*/

var apps = ['google', 'facebook', 'twitter', 'linkedin'];
var App = {
  GOOGLE: apps[0],
  FACEBOOK: apps[1],
  TWITTER: apps[2],
  LINKEDIN: apps[3]
};

var constants = {
  App: App
};

/**
 * Schema
 */
var schema = new mongoose.Schema({
  app: String,
  appId: String,
  username: String,
  profileUrl: String,
  images: [String],
  email: String,
  locale: String,
  token: String,
  tokenSecret: String,
  extras: String
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
    var app = new Model({
      name: body.name,
      type: body.type,
      domain: body.domain
    });

    app.save().then(res => resolve(res.details), reject);
  });
};

ModelDef = mongoose.model('AppAuth', schema);

/**
 * Exports
 */
module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
