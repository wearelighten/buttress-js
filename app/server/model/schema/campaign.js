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

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Model = require('../');
const Logging = require('../../logging');
const Shared = require('../shared');
const Config = require('../../config');
const Helpers = require('../../helpers');
const EmailFactory = require('../../email/factory');

/* ********************************************************************************
 *
 * LOCALS
 *
 **********************************************************************************/

const schema = new mongoose.Schema({strict: false});
let ModelDef = null;

/* ********************************************************************************
 *
 * EMBEDDED DEPENDENCIES
 *
 **********************************************************************************/

/* ********************************************************************************
 *
 * CONSTANTS
 *
 **********************************************************************************/
const constants = {
};

const types = ['email', 'phone', 'social', 'combined'];
const Type = {
  EMAIL: types[0],
  PHONE: types[1],
  SOCIAL: types[2],
  COMBINED: types[3]
};

constants.Type = Type;

/**
 * Schema
 */

schema.add({
  name: {
    type: String,
    index: true
  },
  type: {
    type: String,
    enum: types
  },
  description: String,
  legals: String,
  _app: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'App'
  },
  filters: [{name: String, value: String}],
  _companies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  }],
  _people: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person'
  }],
  _contactLists: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contactlist'
  }],
  images: [{label: String, pathname: String}],
  templates: [{label: String, markup: String}],
  metadata: [{key: String, value: String}],
  notes: [{
    text: String,
    timestamp: {
      type: Date,
      default: Date.create
    }
  }]
});

/*
  VIRTUALS
 */
schema.virtual('details').get(function() {
  return {
    id: this._id,
    name: this.name,
    type: this.type,
    description: this.description,
    legals: this.legals,
    filters: this.filters.map(f => ({name: f.name, value: f.value})),
    companies: this._companies,
    people: this._people,
    contactLists: this.contactLists,
    images: this.images.map(i => i.label),
    templates: this.templates.map(t => t.label),
    metadata: this._metadata,
    notes: this.notes.map(n => ({text: n.text, timestamp: n.timestamp}))
  };
});

schema.virtual('contactLists').get(function() {
  if (!this._contactLists) {
    return [];
  }

  return this._contactLists.map(cl => cl && cl._id ? cl._id : cl);
});

schema.virtual('_metadata').get(function() {
  return this.metadata ? this.metadata
    .map(m => ({key: m.key, value: JSON.parse(m.value)})) : [];
});

/* ********************************************************************************
 *
 * SCHEMA STATIC METHODS
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

  if (!body.name) {
    res.isValid = false;
    res.missing.push('name');
  }
  if (!body.type) {
    res.isValid = false;
    res.missing.push('type');
  }
  if (!body.filters) {
    res.isValid = false;
    res.missing.push('filters');
  }
  if (!body.companies && !body.people) {
    res.isValid = false;
    res.missing.push('data');
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
const __addCampaign = body => {
  return prev => {
    const campaign = new ModelDef({
      _app: Model.authApp._id,
      name: body.name,
      type: body.type,
      filters: body.filters,
      _companies: body.companies,
      _people: body.people,
      description: body.description,
      legals: body.legals
    });

    return campaign.save()
      .then(c => prev.concat([c]));
  };
};

schema.statics.add = body => {
  if (body instanceof Array === false) {
    body = [body];
  }

  return body.reduce((promise, item) => {
    return promise
      .then(__addCampaign(item))
      .catch(Logging.Promise.logError());
  }, Promise.resolve([]));
};

schema.methods.addContactList = function(body) {
  return Model.Contactlist.add(this, body)
    .then(cl => {
      Logging.logDebug(cl[0]._id);
      this._contactLists.push(cl[0]);
      return this.save().then(() => cl[0]);
    });
};

schema.methods.removeContactList = function(contactList) {
  return Promise.resolve(true);
};

// /**
//  * @param {Object} body - body passed through from a POST request
//  * @return {Promise} - returns a promise that is fulfilled when the database request is completed
//  */
// schema.statics.add = body => {
//   var campaign = new ModelDef({
//     _app: Model.authApp.id,
//     name: body.name,
//     type: body.type,
//     description: body.description,
//     legals: body.legals
//   });
//
//   // Logging.log(body);
//   Logging.log(campaign.name, Logging.Constants.LogLevel.DEBUG);
//   Logging.log(campaign.description, Logging.Constants.LogLevel.DEBUG);
//   Logging.log(campaign.legals, Logging.Constants.LogLevel.DEBUG);
//
//   return campaign.save();
// };

/**
 * @return {Promise} - resolves once all have been deleted
 */
schema.statics.rmAll = () => {
  return ModelDef.remove({});
};

/* ********************************************************************************
 *
 * UPDATE BY PATH
 *
 **********************************************************************************/

const PATH_CONTEXT = {
  'notes': {type: 'vector-add', values: []},
  'notes.([0-9]{1,3})': {type: 'vector-rm', values: ['remove']},
  'notes.([0-9]{1,3}).text': {type: 'scalar', values: []}
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

/**
 * @param {String} label - unique (to campaign) label for image
 * @param {String} image - encoded image data
 * @param {String} encoding - encoding used (defaults to base64)
 * @return {Promise} - resolves to  {label, url}
 */
schema.methods.addImage = function(label, image, encoding) {
  encoding = encoding || 'base64';
  let buffer = Buffer.from(image, encoding);

  return new Promise((resolve, reject) => {
    let uid = Model.authApp.getPublicUID();
    let dirName = `${Config.appDataPath}/public/${uid}/campaign-images`;
    let pathName = `${dirName}/${label}.png`;
    let prefix = `${Config.app.protocol}://${Config.app.subdomain}.${Config.app.domain}`;
    let url = `${prefix}/${uid}/campaign-images/${label}.png`;
    Logging.log(pathName, Logging.Constants.LogLevel.DEBUG);

    Model.authApp.mkDataDir('campaign-images', Model.Constants.App.PUBLIC_DIR)
      .then(() => {
        fs.writeFile(pathName, buffer, 'binary', err => {
          if (err) {
            reject(err);
            return;
          }

          if (!this.images.find(i => i.label === label)) {
            this.images.push({
              label: label,
              pathname: pathName
            });
            this.save()
              .then(Helpers.Promise.inject({
                label: label,
                url: url
              }))
              .then(resolve, reject);
            return;
          }

          resolve({
            label: label,
            url: url
          });
        });
      });
  });
};

/**
 * @param {String} label - unique (to campaign) label for image
 * @param {String} markup - encoded markup data
 * @param {String} format - format used (defaults to pug)
 * @param {String} encoding - encoding used (defaults to base64)
 * @return {Promise} - resolves to  {label, url}
 */
schema.methods.addTemplate = function(label, markup, format, encoding) {
  format = format || 'pug';
  encoding = encoding || 'base64';
  let buffer = Buffer.from(markup, encoding);

  return new Promise((resolve, reject) => {
    let uid = Model.authApp.getPublicUID();
    let dirName = `${Config.appDataPath}/private/${uid}/campaign-templates`;
    let pathName = `${dirName}/${label}.${format}`;
    Logging.log(pathName, Logging.Constants.LogLevel.DEBUG);

    Model.authApp.mkDataDir('campaign-templates')
      .then(() => {
        fs.writeFile(pathName, buffer, err => {
          if (err) {
            reject(err);
            return;
          }

          if (!this.templates.find(i => i.label === label)) {
            this.templates.push({
              label: label,
              markup: pathName
            });
            this.save()
              .then(Helpers.Promise.inject({
                label: label
              }))
              .then(resolve, reject);
            return;
          }
          EmailFactory.clearTemplate(pathName);

          resolve({
            label: label
          });
        });
      });
  });
};

/**
 * @param {String} template - template label to be used to create the preview
 * @param {Object} body - Any parameters required for the email
 * @return {Promise} - resolves to  {url}
 */
schema.methods.createPreviewEmail = function(template, body) {
  let uid = Model.authApp.getPublicUID();
  let prefix = `${Config.app.protocol}://${Config.app.subdomain}.${Config.app.domain}`;
  let url = `${prefix}/${uid}/campaign-previews/${template}-preview.html`;

  let params = {
    template: template,
    subject: body.subject ? `${body.subject} - PREVIEW` : 'Welcome to Blocklist - PREVIEW',
    headerImgSrc: body.imgHeaderSrc ? body.imgHeaderSrc : '',
    person: {
      forename: body.person.forename ? body.person.forename : 'Chris',
      surname: body.person.surname ? body.person.surname : 'Bates-Keegan',
      name: body.person.name ? body.person.name : 'Chris Bates-Keegan',
      email: body.person.email ? body.person.email : 'chris@wearelighten.co.uk'
    },
    app: {
      name: Model.authApp.name,
      trackingCode: 'welcome',
      templatePath: path.join(Config.appDataPath, `/private/${uid}/campaign-templates`)
    }
  };

  return new Promise((resolve, reject) => {
    Model.authApp.mkDataDir('campaign-previews', Model.Constants.App.PUBLIC_DIR)
      .then(() => {
        return EmailFactory.create(params);
      })
      .then(email => {
        let previewPath = path.join(Config.appDataPath, `/public/${uid}/campaign-previews`);
        fs.writeFile(path.join(previewPath, `${template}-preview.html`), email.html, err => {
          if (err) {
            reject(err);
            return;
          }
          resolve({url: url});
        });
      })
      .catch(Logging.Promise.logError());
  });
};

/* ********************************************************************************
 *
 * METADATA
 *
 **********************************************************************************/

schema.methods.addOrUpdateMetadata = Shared.addOrUpdateMetadata;
schema.methods.findMetadata = Shared.findMetadata;
schema.methods.rmMetadata = Shared.rmMetadata;

/**
 * @return {Promise} - resolves to an array of Apps (native Mongoose objects)
 */
schema.statics.getAll = () => {
  Logging.log(`getAll: ${Model.authApp._id}`, Logging.Constants.LogLevel.DEBUG);
  return ModelDef.find({_app: Model.authApp._id}).then(campaigns => campaigns.map(c => c.details));
};

/**
 * @param {string} name - Name of the authenticating App (facebook|twitter|google) that owns the user
 * @return {Promise} - resolves to an array of Apps (native Mongoose objects)
 */
schema.statics.getByName = name => {
  Logging.log(`getByName: ${name}`, Logging.Constants.LogLevel.DEBUG);

  return ModelDef.findOne({_app: Model.authApp._id, name: name});
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
