'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file address.js
 * @description Address model definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

const mongoose = require('mongoose');
// const Logging = require('../../logging');
const addressit = require('addressit');

let schema = new mongoose.Schema();
let ModelDef = null;
let constants = {};

/* ********************************************************************************
 *
 * SCHEMA
 *
 **********************************************************************************/
schema.add({
  full: String,
  unit: String,
  number: String,
  street: String,
  town: String,
  city: String,
  county: String,
  postcode: String
});

/* ********************************************************************************
 *
 * SCHEMA VIRTUAL
 *
 **********************************************************************************/

schema.virtual('details').get(function() {
  return {
    full: this.full,
    unit: this.unit,
    number: this.number,
    street: this.street,
    town: this.town,
    city: this.city,
    county: this.county,
    postcode: this.postcode
  };
});

/* ********************************************************************************
 *
 * SCHEMA STATIC
 *
 **********************************************************************************/

/*
 * @param {String} name - name of the address
 * @param {String} address - unstructured string containing the address
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.statics.create = address => {
  let structured = addressit(address, {locale: 'en-GB'});
  let regions = structured.regions;

  // Logging.logDebug(structured);
  return new ModelDef({
    full: address,
    unit: structured.unit,
    number: structured.number,
    street: structured.street,
    town: regions.length >= 2 ? regions.shift() : '',
    city: regions.length >= 1 ? regions.shift() : '',
    county: structured.state,
    postcode: structured.postalcode
  });
};

/* ********************************************************************************
 *
 * SCHEMA METHODS
 *
 **********************************************************************************/

schema.methods.update = function(address) {
  let structured = addressit(address, {locale: 'en-GB'});
  let regions = structured.regions;

  this.full = address;
  this.unit = structured.unit;
  this.number = structured.number;
  this.street = structured.street;
  this.town = regions.length >= 2 ? regions.shift() : '';
  this.city = regions.length >= 2 ? regions.shift() : '';
  this.county = structured.state;
  this.postcode = structured.postalcode;
};

ModelDef = mongoose.model('Address', schema);

module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
