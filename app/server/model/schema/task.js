'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file task.js
 * @description Task model definition.
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
  name: String
});

ModelDef = mongoose.model('Task', schema);

module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
