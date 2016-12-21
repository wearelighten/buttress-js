'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file call.js
 * @description Call model definition.
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
  _campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  _calls: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Call'
  }],
  metadata: [{key: String, value: String}]
});

ModelDef = mongoose.model('Calllist', schema);

module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;

