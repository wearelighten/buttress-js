'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file contact.js
 * @description Contact model definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

const mongoose = require('mongoose');
const humanname = require('humanname');

let schema = new mongoose.Schema();
let ModelDef = null;
let constants = {};

/* ********************************************************************************
 *
 * SCHEMA
 *
 **********************************************************************************/
schema.add({
  name: String,
  email: String,
  landline: String,
  mobile: String,
  role: String,
  active: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
});

/* ********************************************************************************
 *
 * SCHEMA VIRTUAL
 *
 **********************************************************************************/

schema.virtual('details').get(function() {
  const name = humanname.parse(this.name);
  const formalName =
  `${name.title ? name.title + ' ' : ''}${name.firstName} ${name.initials ? name.initials + ' ' : ''}${name.lastName}`;

  // Logging.logDebug(name);

  return {
    name: {
      full: this.name,
      formal: formalName,
      title: name.title,
      forename: name.firstName,
      initials: name.initials,
      surname: name.lastName,
      suffix: name.suffix
    },
    role: this.role,
    email: this.email,
    landline: this.landline,
    mobile: this.mobile,
    active: this.active,
    order: this.order
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
schema.statics.create = details => {
  return new ModelDef({
    name: details.name,
    email: details.email,
    landline: details.landline,
    mobile: details.mobile
  });
};

/* ********************************************************************************
 *
 * SCHEMA METHODS
 *
 **********************************************************************************/

schema.methods.update = function(details) {
  this.name = details.name ? details.name : this.name;
  this.email = details.email ? details.email : this.email;
  this.landline = details.landline ? details.landline : this.landline;
  this.mobile = details.mobile ? details.mobile : this.mobile;
  this.active = details.active === undefined ? this.active : details.active;
  this.order = details.order === undefined ? this.order : details.order;
};

ModelDef = mongoose.model('Contact', schema);

module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;

