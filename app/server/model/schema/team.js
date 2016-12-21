'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file team.js
 * @description Team model definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

const mongoose = require('mongoose');

let schema = new mongoose.Schema();
let ModelDef = null;
let constants = {};

schema.add({
  name: String,
  _app: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application'
  },
  _lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  metadata: [{key: String, value: String}]
});

ModelDef = mongoose.model('Team', schema);

module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
