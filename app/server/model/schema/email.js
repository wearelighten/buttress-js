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
const Model = require('../');
const Logging = require('../../logging');

/**
 * Constants
 */

var constants = {
};

// Logging.log(Model.initModel('Appauth'));
// Logging.log(Model.Schema.Appauth);

/**
 * Schema
 */
var schema = new mongoose.Schema();
schema.add({
});

var ModelDef = null;

/**
 * @type {{constants: {}, schema: {}, model: {}}}
 */
module.exports = {
  constants: constants,
  schema: schema,
  model: ModelDef
};
