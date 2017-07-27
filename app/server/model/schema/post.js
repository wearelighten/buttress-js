'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file post.js
 * @description Post model definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

const mongoose = require('mongoose');
const Shared = require('../shared');
const Model = require('../');
const Logging = require('../../logging');
require('sugar');

/* ********************************************************************************
 *
 * LOCALS
 *
 **********************************************************************************/
let schema = new mongoose.Schema();
let ModelDef = null;

/* ********************************************************************************
 *
 * CONSTANTS
 *
 **********************************************************************************/
let constants = {};

const types = [
  'free',
  'company',
  'campaign',
  'contact-list',
  'call',
  'appointment',
  'contract'
];
const Type = {
  FREE: types[0],
  COMPANY: types[1],
  CAMPAIGN: types[2],
  CONTACT_LIST: types[3],
  CALL: types[4],
  APPOINTMENT: types[5],
  CONTRACT: types[6]
};

constants.Type = Type;

/* ********************************************************************************
 *
 * SCHEMA
 *
 **********************************************************************************/
schema.add({
  text: String,
  image: String,
  url: String,
  tags: String,
  postType: {
    type: String,
    enum: types
  },
  _app: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'App'
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  timestamp: {
    type: Date,
    default: Date.create
  },
  metadata: [{key: String, value: String}],
  likeUserIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  notes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: String,
    timestamp: {
      type: Date,
      default: Date.create
    }
  }]
});

/* ********************************************************************************
 *
 * VIRTUALS
 *
 **********************************************************************************/
schema.virtual('details').get(function() {
  return {
    id: this._id,
    text: this.text,
    image: this.image,
    tags: this.tags,
    url: this.url,
    type: this.postType,
    ownerId: this.ownerId && this.ownerId._id ? this.ownerId._id : this.ownerId,
    entityId: this.entityId,
    timestamp: this.timestamp,
    likeUserIds: this.likeUserIds,
    notes: this.notes.map(n => ({text: n.text, timestamp: n.timestamp, userId: n.userId}))
  };
});

/* ********************************************************************************
 *
 * STATICS
 *
 **********************************************************************************/
/**
 * @param {Object} body - body passed through from a POST request to be validated
 * @return {Object} - returns an object with validation context
 */
const __doValidation = body => {
  let res = {
    isValid: true,
    missing: [],
    invalid: []
  };

  if (!body.ownerId) {
    res.isValid = false;
    res.missing.push('ownerId');
  }
  if (!body.text) {
    res.isValid = false;
    res.missing.push('name');
  }
  if (!body.type) {
    res.isValid = false;
    res.missing.push('type');
  }
  if (types.indexOf(body.type) === -1) {
    res.isValid = false;
    res.invalid.push('type');
  }

  return res;
};

schema.statics.validate = body => {
  if (body instanceof Array === false) {
    body = [body];
  }
  let validation = body.map(__doValidation).filter(v => v.isValid === false);

  return validation.length >= 1 ? validation[0] : {isValid: true};
};

/*
 * @param {Object} body - body passed through from a POST request
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
const __add = body => {
  return prev => {
    const md = new ModelDef({
      _app: Model.authApp._id,
      ownerId: body.ownerId,
      text: body.text,
      image: body.image,
      url: body.url,
      tags: body.tags,
      postType: body.type,
      entityId: body.entityId
    });

    if (body.id) {
      md._id = body.id;
    }

    return md.save()
      .then(o => prev.concat([o]));
  };
};

schema.statics.add = body => {
  if (body instanceof Array === false) {
    body = [body];
  }

  return body.reduce((promise, item) => {
    return promise
      .then(__add(item))
      .catch(Logging.Promise.logError());
  }, Promise.resolve([]));
};

const collection = Model.mongoDb.collection('posts');
/**
 * @return {Promise} - resolves to an array of Apps (native Mongoose objects)
 */
schema.statics.getAll = () => {
  Logging.logSilly(`getAll: ${Model.authApp._id}`);
  return collection.find({_app: Model.authApp._id}, {metadata: 0});
};

schema.statics.rmAll = () => {
  return ModelDef.remove({});
};

/* ********************************************************************************
 *
 * UPDATE BY PATH
 *
 **********************************************************************************/

const PATH_CONTEXT = {
  '^(text|image|url|tags)$': {type: 'scalar', values: []},
  '^likeUserIds$': {type: 'vector-add', values: []},
  '^likeUserIds.([0-9]{1,3}).__remove__$': {type: 'vector-rm', values: []},
  '^notes$': {type: 'vector-add', values: []},
  '^notes.([0-9]{1,3}).__remove__$': {type: 'vector-rm', values: []},
  '^notes.([0-9]{1,3}).text$': {type: 'scalar', values: []}
};

schema.statics.validateUpdate = Shared.validateUpdate(PATH_CONTEXT);
schema.methods.updateByPath = Shared.updateByPath(PATH_CONTEXT);

/* ********************************************************************************
 *
 * METHODS
 *
 **********************************************************************************/

/**
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.methods.rm = function() {
  return ModelDef.remove({_id: this._id});
};

/* ********************************************************************************
 *
 * METADATA
 *
 **********************************************************************************/

schema.methods.addOrUpdateMetadata = Shared.addOrUpdateMetadata;
schema.methods.findMetadata = Shared.findMetadata;
schema.methods.rmMetadata = Shared.rmMetadata;
schema.statics.getAllMetadata = Shared.getAllMetadata(collection);

/* ********************************************************************************
 *
 * EXPORTS
 *
 **********************************************************************************/
ModelDef = mongoose.model('Post', schema);

module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
