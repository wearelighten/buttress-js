'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file schemaModel.js
 * @description A default model for schemas
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

const ObjectId = require('mongodb').ObjectId;
const Logging = require('../logging');
const Shared = require('./shared');
const shortId = require('../helpers').ShortId;

/* ********************************************************************************
 *
 * LOCALS
 *
 **********************************************************************************/

class SchemaModel {

  constructor(MongoDb, schema, app) {
    this.schema = schema;
    this.app = app || null;

    this.appShortId = (app) ? shortId(app._id) : null;
    this.collectionName = `${schema.collection}`;

    if (this.appShortId) {
      this.collectionName = `${this.appShortId}-${this.collectionName}`;
    }

    this.collection = MongoDb.collection(this.collectionName);
  }

  __doValidation(body) {
    let res = {
      isValid: true,
      missing: [],
      invalid: []
    };

    let app = Shared.validateAppProperties(this.schema, body);
    if (app.isValid === false) {
      res.isValid = false;
      res.invalid = res.invalid.concat(app.invalid);
      res.missing = res.missing.concat(app.missing);
    }

    return res;
  }
  validate(body) {
    if (body instanceof Array === false) {
      body = [body];
    }
    let validation = body.map(b => this.__doValidation(b)).filter(v => v.isValid === false);

    return validation.length >= 1 ? validation[0] : {isValid: true};
  }

  /*
  * @param {Object} body - body passed through from a POST request
  * @return {Promise} - returns a promise that is fulfilled when the database request is completed
  */
  __add(body, internals) {
    return prev => {
      const entity = Object.assign({}, internals);

      if (body.id) {
        entity._id = new ObjectId(body.id);
      }

      if (this.schema.extends.includes('timestamps')) {
        entity.createdAt = new Date();
        entity.updatedAt = null;
      }

      const validated = Shared.applyAppProperties(this.schema, body);
      return prev.concat([Object.assign(validated, entity)]);
    };
  }
  add(body, internals) {
    const sharedAddFn = Shared.add(this.collection, item => this.__add(item, internals));
    return sharedAddFn(body);
  }

  update(query, id) {
    return new Promise((resolve, reject) => {
      this.collection.update({_id: id}, {
        $set: query
      }, (err, object) => {
        if (err) throw new Error(err);

        resolve(object);
      });
    });
  }
  validateUpdate(body) {
    const sharedFn = Shared.validateUpdate({}, this.schema);
    return sharedFn(body);
  }
  updateByPath(body, id) {
    const sharedFn = Shared.updateByPath({}, this.schema, this.collection);

    if (body instanceof Array === false) {
      body = [body];
    }

    if (this.schema.extends.includes('timestamps')) {
      body.push({
        path: 'updatedAt',
        value: new Date(),
        contextPath: '^updatedAt$'
      });
    }

    return sharedFn(body, id);
  }

  exists(id) {
    return this.collection.find({_id: new ObjectId(id)})
      .limit(1)
      .count()
      .then(count => count > 0);
  }

  /*
  * @return {Promise} - returns a promise that is fulfilled when the database request is completed
  */
  isDuplicate(details) {
    return Promise.resolve(false);
  }

  /**
   * @param {App} company - Company object to be deleted
   * @return {Promise} - returns a promise that is fulfilled when the database request is completed
   */
  // NOTE: Convert away from Mongoose
  rm(entity) {
    Logging.log(`DELETING: ${entity._id}`, Logging.Constants.LogLevel.DEBUG);
    return new Promise(resolve => {
      this.collection.remove({_id: new ObjectId(entity._id)}, (err, cursor) => {
        if (err) throw err;
        resolve(cursor);
      });
    });
  }

  /**
   * @param {Array} ids - Array of company ids to delete
   * @return {Promise} - returns a promise that is fulfilled when the database request is completed
   */
  // NOTE: Convert away from Mongoose
  rmBulk(ids) {
    Logging.log(`DELETING: ${ids}`, Logging.Constants.LogLevel.SILLY);
    // return ModelDef.remove({_id: {$in: ids}}).exec();
  }

  /*
   * @param {Object} query - mongoDB query
   * @return {Promise} - returns a promise that is fulfilled when the database request is completed
   */
  rmAll(query) {
    if (!query) query = {};

    return new Promise(resolve => {
      this.collection.remove(query, (err, doc) => {
        if (err) throw err;
        resolve(doc);
      });
    });
  }

  /**
   * @param {String} id - company id to get
   * @return {Promise} - resolves to an array of Companies
   */
  findById(id) {
    return new Promise(resolve => {
      this.collection.findOne({_id: new ObjectId(id)}, {metadata: 0}, (err, doc) => {
        if (err) throw err;
        resolve(doc);
      });
    });
  }

  /**
   * @param {Object} query - mongoDB query
   * @param {Object} excludes - mongoDB query excludes
   * @return {Promise} - resolves to an array of docs
   */
  find(query, excludes = {}) {
    Logging.logSilly(`find: `);

    return new Promise(resolve => {
      this.collection.find(query, excludes, (err, doc) => {
        if (err) throw err;
        resolve(doc);
      });
    });
  }

  /**
   * @param {Object} query - mongoDB query
   * @param {Object} excludes - mongoDB query excludes
   * @return {Promise} - resolves to an array of docs
   */
  findOne(query, excludes = {}) {
    Logging.logSilly(`findOne: ${query}`);

    return new Promise(resolve => {
      this.collection.find(query, excludes).toArray((err, doc) => {
        if (err) throw err;
        resolve(doc[0]);
      });
    });
  }

  /**
   * @return {Promise} - resolves to an array of Companies
   */
  findAll() {
    Logging.logSilly(`findAll: `);

    return this.collection.find({});
  }

  /**
   * @param {Array} ids - Array of company ids to get
   * @return {Promise} - resolves to an array of Companies
   */
  findAllById(ids) {
    // Logging.log(`findAllById: ${Model.authApp._id}`, Logging.Constants.LogLevel.INFO);

    // return this.collection.find({_id: {$in: ids.map(id => new ObjectId(id))}, _app: Model.authApp._id}, {metadata: 0});
    return this.collection.find({_id: {$in: ids.map(id => new ObjectId(id))}}, {metadata: 0});
  }
}

module.exports = SchemaModel;
