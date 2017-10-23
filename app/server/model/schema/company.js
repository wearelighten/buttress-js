'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file company.js
 * @description Company model definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

const mongoose = require('mongoose');
const ObjectId = require('mongodb').ObjectId;
const Model = require('../');
const Logging = require('../../logging');
const Shared = require('../shared');
const Sugar = require('sugar');

/* ********************************************************************************
 *
 * LOCALS
 *
 **********************************************************************************/
const schema = new mongoose.Schema({}, {strict: false});
let ModelDef = null;
const constants = {};
const collectionName = 'companies';
const collection = Model.mongoDb.collection(collectionName);

/* ********************************************************************************
 *
 * EMBEDDED DEPENDENCIES
 *
 **********************************************************************************/

Model.initModel('Location');
Model.initModel('Contact');

/* ********************************************************************************
 *
 * CONSTANTS
 *
 **********************************************************************************/
const types = [
  'prospect',
  'client',
  'supplier'
];

constants.Type = {
  PROSPECT: types[0],
  CLIENT: types[1],
  SUPPLIER: types[2]
};

const employeeBands = [
  '1-4',
  '5-9',
  '10-19',
  '20-99',
  '100-499',
  '500-999',
  '1000-1999',
  '2000-4999',
  '5000-10000',
  '>10000'
];
constants.EmployeeBands = {
  BAND_1: employeeBands[0],
  BAND_2: employeeBands[1],
  BAND_3: employeeBands[2],
  BAND_4: employeeBands[3],
  BAND_5: employeeBands[4],
  BAND_6: employeeBands[5],
  BAND_7: employeeBands[6],
  BAND_8: employeeBands[7],
  BAND_9: employeeBands[8],
  BAND_10: employeeBands[9]
};

const turnoverBands = [
  '0-99k',
  '100k-199k',
  '200k-299k',
  '300k-499k',
  '500k-999k',
  '1m-4.99m',
  '5m-10m',
  '>10m'
];
constants.TurnoverBands = {
  BAND_1: turnoverBands[0],
  BAND_2: turnoverBands[1],
  BAND_3: turnoverBands[2],
  BAND_4: turnoverBands[3],
  BAND_5: turnoverBands[4],
  BAND_6: turnoverBands[5],
  BAND_7: turnoverBands[6],
  BAND_8: turnoverBands[7]
};

/* ********************************************************************************
 *
 * SCHEMA
 *
 **********************************************************************************/
schema.add({
  companyType: {
    type: String,
    default: constants.Type.PROSPECT
  },
  name: String,
  siccode: Number,
  reference: String,
  description: String,
  parentCompanyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  childType: {
    type: String,
    default: ''
  },
  salesStatus: String,
  source: String,
  companyNumber: Number,
  numEmployees: Number,
  employeeBand: {
    type: String,
    enum: employeeBands
  },
  annualTurnover: Number,
  profitPreTax: Number,
  financeAnnualEndDate: Date,
  netWorth: Number,
  turnoverBand: {
    type: String,
    enum: turnoverBands
  },
  vatExempt: Boolean,
  vatRegistrationNumber: String,
  sector: String,
  subsector: String,
  memberships: String,
  flags: String,
  website: String,
  socialMedia: [{
    type: String,
    url: String
  }],
  primaryLocation: String,
  locations: [{
    name: String,
    address: String,
    city: String,
    county: String,
    region: String,
    postCode: String,
    phoneNumber: String,
    email: String,
    site: String
  }],
  primaryContact: String,
  contacts: [{
    name: String,
    role: String,
    responsibility: String,
    email: String,
    mobile: String,
    directDial: String,
    linkedInProfile: String,
    twitterProfile: String
  }],
  emailHistory: [{
    sent: Boolean,
    received: Boolean,
    timestamp: Date,
    emailId: String,
    threadId: String,
    to: [String],
    from: String,
    subject: String,
    snippet: String
  }],
  contractIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract'
  }],
  _app: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application'
  },
  metadata: [{key: String, value: String}],
  notes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: String,
    timestamp: {
      type: Date,
      default: Sugar.Date.create
    }
  }]
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
  if (body.companyType && !types.indexOf(body.companyType) === -1) {
    res.isValid = false;
    res.invalid.push('companyType');
  }
  // if (!body.location && !body.locations) {
  //   res.isValid = false;
  //   res.missing.push('location');
  // }
  if (body.location) {
    body.location._id = body.location.id ? body.location.id : (new ObjectId()).toHexString();
    delete body.location.id;
    if (!body.location.name) {
      res.isValid = false;
      res.missing.push('location.name');
    }
    if (!body.location.postCode) {
      res.isValid = false;
      res.missing.push('location.postCode');
    }
  }
  if (body.locations) {
    body.locations.forEach((l, idx) => {
      l._id = l.id ? new ObjectId(l.id) : (new ObjectId()).toHexString();
      delete l.id;
      if (!l.name) {
        res.isValid = false;
        res.missing.push(`locations.${idx}.name`);
      }
      if (!l.postCode) {
        res.isValid = false;
        res.missing.push(`locations.${idx}.postCode`);
      }
    });
  }

  if (!body.contact && !body.contacts) {
    res.isValid = false;
    res.missing.push('contact');
  }
  if (body.contact) {
    body.contact._id = body.contact.id ? body.contact.id : (new ObjectId()).toHexString();
    delete body.contact.id;
    // if (!body.contact.name) {
    //   res.isValid = false;
    //   res.missing.push('contact.name');
    // }
    // if (!body.contact.role) {
    //   res.isValid = false;
    //   res.missing.push('contact.role');
    // }
  }

  if (body.contacts) {
    body.contacts.forEach((c, idx) => {
      c._id = c.id ? new ObjectId(c.id) : (new ObjectId()).toHexString();
      delete c.id;
      // if (!c.name) {
      //   res.isValid = false;
      //   res.missing.push(`contacts.${idx}.name`);
      // }
      // if (!c.role) {
      //   res.isValid = false;
      //   res.missing.push(`contacts.${idx}.role`);
      // }
    });
  }

  let app = Shared.validateAppProperties(collectionName, body);
  if (app.isValid === false) {
    res.isValid = false;
    res.invalid = res.invalid.concat(app.invalid);
    res.missing = res.missing.concat(app.missing);
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
    let contacts = [];
    let locations = [];
    if (body.locations) {
      locations = body.locations;
    } else if (body.location) {
      locations = [body.location];
    }
    if (body.contacts) {
      contacts = body.contacts;
    } else if (body.contact) {
      contacts = [body.contact];
    }

    const md = {
      name: body.name,
      companyType: body.companyType ? body.companyType : '',
      parentCompanyId: body.parentCompanyId ? body.parentCompanyId : undefined,
      childType: body.childType ? body.childType : '',
      salesStatus: body.salesStatus ? body.salesStatus : '',
      siccode: body.siccode ? body.siccode : '',
      reference: body.reference ? body.reference : '',
      description: body.description ? body.description : '',
      source: body.source ? body.source : '',
      flags: body.flags ? body.flags : '',
      memberships: body.memberships ? body.memberships : '',
      companyNumber: body.number ? body.number : body.companyNumber,
      numEmployees: body.numEmployees ? body.numEmployees : 0,
      employeeBand: body.employeeBand ? body.employeeBand : '1-4',
      annualTurnover: body.annualTurnover ? body.annualTurnover : 0,
      turnoverBand: body.turnoverBand ? body.turnoverBand : '0-99k',
      profitPreTax: body.profitPreTax ? body.profitPreTax : 0,
      netWorth: body.netWorth ? body.netWorth : 0,
      financeAnnualEndDate: body.financeAnnualEndDate,
      vatExempt: body.vatExempt ? body.vatExempt : false,
      vatRegistrationNumber: body.vatRegistrationNumber ? body.vatRegistrationNumber : '',
      sector: body.sector ? body.sector : '',
      subsector: body.subsector ? body.subsector : '',
      website: body.website ? body.website : '',
      locations: locations,
      contacts: contacts,
      _app: Model.authApp._id,
      notes: body.notes ? body.notes : [],
      metadata: []
    };

    if (body.id) {
      md._id = new ObjectId(body.id);
    }

    md.primaryContact = null;
    if (md.contacts.length) {
      md.primaryContact = md.contacts[0]._id;
    }
    md.primaryLocation = null;
    if (md.locations.length) {
      md.primaryLocation = md.locations[0]._id;
    }

    const validated = Shared.applyAppProperties(collectionName, body);
    return prev.concat([Object.assign(md, validated)]);
  };
};

schema.statics.add = Shared.add(collection, __add);

/* ********************************************************************************
 *
 * SCHEMA VIRTUAL METHODS
 *
 *********************************************************************************/

schema.virtual('details').get(function() {
  const _locations = this.locations.map(l => {
    Logging.logSilly(l.address);
    return {
      id: l._id,
      name: l.name,
      tag: '',
      address: l.address,
      city: l.city,
      county: l.county,
      postCode: l.postCode,
      phoneNumber: l.phoneNumber,
      site: l.site
    };
  });

  const _contacts = this.contacts.map(c => {
    return {
      id: c._id,
      name: c.name,
      tag: '',
      role: c.role,
      email: c.email,
      directDial: c.directDial,
      mobile: c.mobile
    };
  });
  return {
    id: this._id,
    name: this.name,
    companyType: this.companyType,
    parentCompanyId: this.parentCompanyId,
    childType: this.childType,
    salesStatus: this.salesStatus,
    description: this.description,
    siccode: this.siccode,
    reference: this.reference,
    source: this.source,
    memberships: this.memberships,
    flags: this.flags,
    companyNumber: this.companyNumber,
    numEmployees: this.numEmployees,
    employeeBand: this.employeeBand,
    annualTurnover: this.annualTurnover,
    turnoverBand: this.turnoverBand,
    profitPreTax: this.profitPreTax,
    netWorth: this.netWorth,
    financeAnnualEndDate: this.financeAnnualEndDate,
    vatExempt: this.vatExempt,
    vatRegistrationNumber: this.vatRegistrationNumber,
    sector: this.sector,
    subsector: this.subsector,
    locations: _locations,
    contacts: _contacts,
    contractIds: this.contractIds,
    primaryLocation: this.primaryLocation,
    primaryContact: this.primaryContact,
    website: this.website,
    emailHistory: this.emailHistory,
    notes: this.notes.map(n => ({text: n.text, timestamp: n.timestamp, userId: n.userId}))
  };
});

/* ********************************************************************************
 *
 * SCHEMA METHODS
 *
 **********************************************************************************/

/* ********************************************************************************
 *
 * UPDATE BY PATH
 *
 **********************************************************************************/

const PATH_CONTEXT = {
  '^(name|parentCompanyId|childType|companyType|salesStatus|reference|description|siccode|numEmployees|annualTurnover|profitPreTax|financeEndDate|netWorth|source|memberships|flags|vatExempt|vatRegistrationNumber|companyNumber)$': {type: 'scalar', values: []}, // eslint-disable-line max-len
  '^notes$': {type: 'vector-add', values: []},
  '^notes.([0-9]{1,3})$': {type: 'scalar', values: []},
  '^notes.([0-9]{1,3}).__remove__$': {type: 'vector-rm', values: []},
  '^notes.([0-9]{1,3}).text$': {type: 'scalar', values: []},
  '^emailHistory$': {type: 'vector-add', values: []},
  '^emailHistory.([0-9]{1,3}).(__remove__)$': {type: 'vector-rm', values: []},
  '^contractIds$': {type: 'vector-add', values: []},
  '^contractIds.([0-9]{1,3})$': {type: 'scalar', values: []},
  '^contractIds.([0-9]{1,3}).(__remove__)$': {type: 'vector-rm', values: []},
  '^contacts$': {type: 'vector-add', values: []},
  '^contacts.([0-9]{1,3})$': {type: 'scalar', values: []},
  '^contacts.([0-9]{1,3}).(__remove__)$': {type: 'vector-rm', values: []},
  '^contacts.([0-9]{1,3}).(email|tag|directDial|responsibility|mobile|role|name|linkedInProfile|twitterProfile)$': {type: 'scalar', values: []}
};

schema.statics.validateUpdate = Shared.validateUpdate(PATH_CONTEXT, collectionName);
schema.methods.updateByPath = Shared.updateByPath(PATH_CONTEXT, collectionName);

/* ********************************************************************************
 *
 * SCHEMA DB FUNCTIONS
 *
 **********************************************************************************/

/*
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.statics.isDuplicate = details => {
  return Promise.resolve(false);
};

/**
 * @param {App} company - Company object to be deleted
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.statics.rm = company => {
  Logging.log(`DELETING: ${company._id}`, Logging.Constants.LogLevel.DEBUG);
  // Logging.log(org.details, Logging.Constants.LogLevel.VERBOSE);
  return ModelDef.remove({_id: company._id});
};

/**
 * @param {Array} ids - Array of company ids to delete
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.statics.rmBulk = ids => {
  Logging.log(`DELETING: ${ids}`, Logging.Constants.LogLevel.SILLY);
  return ModelDef.remove({_id: {$in: ids}}).exec();
};

/*
 * @return {Promise} - returns a promise that is fulfilled when the database request is completed
 */
schema.statics.rmAll = () => {
  return ModelDef.remove({});
};

/**
 * @return {Promise} - resolves to an array of Companies
 */
schema.statics.findAll = () => {
  Logging.logSilly(`findAll: ${Model.authApp._id}`);

  if (Model.token.authLevel === Model.Constants.Token.AuthLevel.SUPER) {
    return ModelDef.find({});
  }

  return collection.find({_app: Model.authApp._id}, {metadata: 0});
};

/**
 * @param {Array} ids - Array of company ids to get
 * @return {Promise} - resolves to an array of Companies
 */
schema.statics.findAllById = ids => {
  Logging.log(`findAllById: ${Model.authApp._id}`, Logging.Constants.LogLevel.INFO);

  return ModelDef.find({_id: {$in: ids}, _app: Model.authApp._id});
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
ModelDef = mongoose.model('Company', schema);

module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
