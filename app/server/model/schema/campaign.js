'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file campaign.js
 * @description Campaign definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

const fs = require('fs');
const mongoose = require('mongoose');
const Model = require('../');
const Logging = require('../../logging');
const Config = require('../../config');

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
  name: {
    type: String,
    index: true
  },
  description: String,
  legals: String,
  _app: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'App'
  },
  images: [{label: String, pathname: String}],
  templates: [{label: String, markup: String}],
  metadata: [{key: String, value: String}]
});

var ModelDef = null;

/*
  VIRTUALS
 */
schema.virtual('details').get(function() {
  return {
    id: this._id,
    name: this.name,
    description: this.description,
    legals: this.legals,
    images: this.images.map(i => i.label),
    templates: this.templates.map(t => t.label),
    metadata: this._metadata
  };
});

schema.virtual('_metadata').get(function() {
  return this.metadata
    .map(m => ({key: m.key, value: JSON.parse(m.value)}));
});

/**
 * Schema Static Methods
 */

/**
 * @param {Object} body - body passed through from a POST request
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.statics.add = body => {
  var campaign = new ModelDef({
    _app: Model.app,
    name: body.name,
    description: body.description,
    legals: body.legals
  });

  // Logging.log(body);
  Logging.log(campaign.name, Logging.Constants.LogLevel.DEBUG);
  Logging.log(campaign.description, Logging.Constants.LogLevel.DEBUG);
  Logging.log(campaign.legals, Logging.Constants.LogLevel.DEBUG);

  return campaign.save();
};

schema.methods.addImage = function(label, image, encoding) {
  encoding = encoding || 'base64';
  var buffer = Buffer.from(image, encoding);

  return new Promise((resolve, reject) => {
    var uid = Model.app.getPublicUID();
    var dirName = `${Config.appDataPath}/public/${uid}`;
    var pathName = `${dirName}/${label}.png`;
    Logging.log(pathName, Logging.Constants.LogLevel.DEBUG);

    fs.mkdir(dirName, err => {
      if (err && err.code !== 'EEXIST') {
        reject(err);
        return;
      }

      fs.writeFile(pathName, buffer, 'binary', err => {
        if (err) {
          reject(err);
          return;
        }

        resolve({label: label, url: `${Config.app.protocol}://${Config.app.subdomain}.${Config.app.domain}/${uid}/${label}.png`});
      });
    });
  });
};

/**
 * @param {string} key - index name of the metadata
 * @param {*} value - value of the meta data
 * @return {Promise} - resolves when save operation is completed, rejects if metadata already exists
 */
schema.methods.addOrUpdateMetadata = function(key, value) {
  Logging.log(`${Model.app.id}`, Logging.Constants.LogLevel.DEBUG);
  Logging.log(key, Logging.Constants.LogLevel.DEBUG);
  Logging.log(value, Logging.Constants.LogLevel.DEBUG);

  var exists = this.metadata.find(m => m.key === key);
  if (exists) {
    exists.value = value;
  } else {
    this.metadata.push({key: key, value: value});
  }

  return this.save().then(u => ({key: key, value: JSON.parse(value)}));
};

schema.methods.findMetadata = function(key) {
  Logging.log(`findMetadata: ${key}`, Logging.Constants.LogLevel.VERBOSE);
  Logging.log(this.metadata.map(m => ({key: m.key, value: m.value})),
    Logging.Constants.LogLevel.DEBUG);
  var md = this.metadata.find(m => m.key === key);
  return md ? {key: md.key, value: JSON.parse(md.value)} : false;
};

/**
 * @return {Promise} - resolves to an array of Apps (native Mongoose objects)
 */
schema.statics.getAll = () => {
  Logging.log(`getAll: ${Model.app._id}`, Logging.Constants.LogLevel.DEBUG);
  return ModelDef.find({_app: Model.app._id}).then(campaigns => campaigns.map(c => c.details));
};

/**
 * @param {string} name - Name of the authenticating App (facebook|twitter|google) that owns the user
 * @return {Promise} - resolves to an array of Apps (native Mongoose objects)
 */
schema.statics.getByName = name => {
  Logging.log(`getByName: ${name}`, Logging.Constants.LogLevel.DEBUG);

  return ModelDef.findOne({_app: Model.app._id, name: name});
};

ModelDef = mongoose.model('Campaign', schema);

/**
 * @type {{constants: {}, schema: {}, model: {}}}
 */
module.exports = {
  constants: constants,
  schema: schema,
  model: ModelDef
};
