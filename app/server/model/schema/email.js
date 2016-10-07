'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file email.js
 * @description Email definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

const mongoose = require('mongoose');
const Logging = require('../../logging');
require('sugar');
/**
 * Constants
 */

var constants = {
};

/**
 * Schema
 */
var schema = new mongoose.Schema();
schema.add({
  headers: {
    from: String,
    to: String,
    subject: String
  },
  html: String,
  sendOn: {
    type: Date,
    default: null
  },
  sent: {
    type: Boolean,
    default: false
  },
  sentOn: {
    type: Date,
    default: null
  }
});

var ModelDef = null;

/**
 * @param {Object} body - body passed through from a POST request
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.statics.add = body => {
  var email = new ModelDef({
    headers: {
      from: body.from,
      to: body.to,
      subject: body.subject
    },
    html: body.html,
    sendOn: Date.create(body.sendOn)
  });

  Logging.log(email.headers, Logging.Constants.LogLevel.DEBUG);

  return email.save();
};

/**
 * @type {{constants: {}, schema: {}, model: {}}}
 */
module.exports = {
  constants: constants,
  schema: schema,
  model: ModelDef
};
