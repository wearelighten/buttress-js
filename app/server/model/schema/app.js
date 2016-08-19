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
var Model = require('../');
var Logging = require('../../logging');

/**
 * Constants
*/

var type = ['server', 'ios', 'android', 'browser'];
var Type = {
  SERVER: type[0],
  IOS: type[1],
  ANDROID: type[2],
  BROWSER: type[3]
};

var constants = {
  Type: Type
};

/**
 * Schema
 */
var schema = new mongoose.Schema({
  name: String,
  type: {
    type: String,
    enum: type
  },
  domain: String,
  _token: {
    type: mongoose.Schema.Types.ObjectId,
    reg: 'Token'
  }
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

    Model.Token.add(Model.Constants.Token.Type.APP)
      .then(token => {
        app._token = token;
        app.save().then(res => resolve(Object.assign(res.details,{token: token.value})), reject);
      });
  });
};

ModelDef = mongoose.model('App', schema);

/**
 * Exports
 */
module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
