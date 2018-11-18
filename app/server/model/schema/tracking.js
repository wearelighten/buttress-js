'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file activity.js
 * @description Activity model definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

const SchemaModel = require('../schemaModel');
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
const schema = new mongoose.Schema();
let ModelDef = null;
const collectionName = 'trackings';
const collection = Model.mongoDb.collection(collectionName);

/**
 * Constants
 */
const type = ['interaction', 'error', 'logging'];
const Type = {
  INTERACTION: type[0],
  ERROR: type[1],
  LOGGING: type[2]
};

const constants = {
  Type: Type
};

class TrackingSchemaModel extends SchemaModel {
  constructor(MongoDb) {
    let schema = TrackingSchemaModel.getSchema();
    super(MongoDb, schema);
  }

  static get getSchema() {
    return {
      name: "tracking",
      type: "collection",
      properties: {
        timestamp: {
          __type: "date",
          __default: "now",
          __allowUpdate: false
        },
        userId: {
          __type: "id",
          __required: true,
          __allowUpdate: false
        },
        name: {
          __type: "string",
          __default: "",
          __allowUpdate: true
        },
        type: {
          __type: "string",
          __default: "logging",
          __enum: type,
          __allowUpdate: true
        },
        interaction: {
          type: {
            __type: "string",
            __default: "",
            __allowUpdate: true
          },
          location: {
            __type: "string",
            __default: "",
            __allowUpdate: true
          },
          context: {
            __type: "string",
            __default: "",
            __allowUpdate: true
          }
        },
        error: {
          message: {
            __type: "string",
            __default: "",
            __allowUpdate: true
          },
          url: {
            __type: "string",
            __default: "",
            __allowUpdate: true
          },
          line: {
            __type: "string",
            __default: "",
            __allowUpdate: true
          },
          col: {
            __type: "string",
            __default: "",
            __allowUpdate: true
          }
        },
        logging: {
          level: {
            __type: "string",
            __default: "",
            __allowUpdate: true
          }
        },
        environment: {
          browser: {
            __type: "string",
            __default: "",
            __allowUpdate: true
          },
          os: {
            __type: "string",
            __default: "",
            __allowUpdate: true
          },
          resolution: {
            __type: "string",
            __default: "",
            __allowUpdate: true
          },
          dpi: {
            __type: "string",
            __default: "",
            __allowUpdate: true
          },
          ram: {
            __type: "string",
            __default: "",
            __allowUpdate: true
          }
        },
        _app: {
          __type: "id",
          __required: true,
          __allowUpdate: false
        }
      }
    };
  }

  /**
   * @param {Object} body - body passed through from a POST request to be validated
   * @return {Object} - returns an object with validation context
   */
  __doValidation(body) {
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

    return res;
  }

  validate(body) {
    if (body instanceof Array === false) {
      body = [body];
    }
    let validation = body.map(this.__doValidation).filter(v => v.isValid === false);

    return validation.length >= 1 ? validation[0] : {isValid: true};
  }

  /*
  * @param {Object} body - body passed through from a POST request
  * @return {Promise} - returns a promise that is fulfilled when the database request is completed
  */
  __add(body) {
    return prev => {
      prev.push({
        _app: Model.authApp._id,
        userId: Model.authUser._id,
        timestamp: Sugar.Date.create(),
        name: body.name,
        type: body.type,
        interaction: body.interaction,
        error: body.error,
        logging: body.logging,
        environment: body.environment
      });
      return prev;
    };
  };

  add(body) {
    const sharedFn = Shared.add(collection, __add);
    const result = sharedFn(body);

    return result
    .then(ids => {
      return new Promise(resolve => {
        if (Array.isArray(ids) === true) {
          return collection.find({_id: {$in: ids}}, {}).toArray((err, docs) => {
            if (err) throw new Error(err);
            resolve(docs);
          });
        }

        resolve(ids);
      });
    });
  }

  /**
   * @return {Promise} - resolves to an array of Apps (native Mongoose objects)
   */
  findAll() {
    Logging.log(`findAll: ${Model.authApp._id}`, Logging.Constants.LogLevel.DEBUG);

    if (Model.token.authLevel === Model.Constants.Token.AuthLevel.SUPER) {
      return ModelDef.find({});
    }

    return ModelDef.find({_app: Model.authApp._id});
  }

  /**
   * @param {String} id - Object id as a hex string
   * @return {Promise} - resolves to an array of Apps (native Mongoose objects)
   */
  getFromId(id) {
    return new Promise(resolve => {
      collection.findOne({_id: new ObjectId(id)}, {metadata: 0}, (err, doc) => {
        if (err) throw err;
        doc.id = doc._id;
        delete doc._id;
        resolve(doc);
      });
    });
  }

  exists(id) {
    return collection.find({_id: new ObjectId(id)})
      .limit(1)
      .count()
      .then(count => count > 0);
  }

    /**
   * @return {Promise} - resolves to an array of Apps (native Mongoose objects)
   */
  getAll() {
    Logging.log(`findAll: ${Model.authApp._id}`, Logging.Constants.LogLevel.DEBUG);

    if (Model.token.authLevel === Model.Constants.Token.AuthLevel.SUPER) {
      return collection.find({});
    }

    return collection.find({_app: Model.authApp._id}, {metadata: 0});
  }

  rmAll() {
    return ModelDef.remove({_app: Model.authApp._id});
  }
}

/* ********************************************************************************
*
* EXPORTS
*
**********************************************************************************/
module.exports = TrackingSchemaModel;
