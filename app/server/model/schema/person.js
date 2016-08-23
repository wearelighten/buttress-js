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
  title: String,
  forename: String,
  surname: String,
  email: {
    type: String,
    index: true
  },
  address: String,
  postcode: String,
  phone: {
    landline: String,
    mobile: String
  },
  membershipNumber: String,
  voterId: String,
  meta: [{
    key: String,
    value: String
  }],
  _dataOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
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
    forename: this.forename,
    surname: this.surname,
    name: `${this.forename} ${this.surname}`,
    address: this.address,
    postcode: this.postcode,
    phone: {
      landline: this.landline,
      mobile: this.mobile
    },
    membershipNumber: this.membershipNumber,
    voterId: this.voterId,
    dataOwner: this._dataOwner && this._dataOwner.name ? this._dataOwner.name : false,
    meta: this.meta
  };
});

/**
 * Schema Static Methods
 */

/**
 * @param {Object} body - body passed through from a POST request
 * @param {Object} owner - Owner group Mongoose object
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.statics.add = (body, owner) => {
  return new Promise((resolve, reject) => {
    var app = new ModelDef({
      forename: body.forename,
      surname: body.surname,
      email: body.surname,
      telephone: {
        landline: body.landline,
        mobile: body.mobile
      },
      address: body.address,
      postcode: body.postcode,
      membershipNumber: body.membershipNumber,
      voterId: body.voterId,
      _dataOwner: owner
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
