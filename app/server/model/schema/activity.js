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
// const Sugar = require('sugar');
const Shared = require('../shared');
// const Helpers = require('../../helpers');
// const Config = require('node-env-obj')('../../');

/**
 * Constants
*/
const visibility = ['public', 'private'];
const Visibility = {
  PUBLIC: visibility[0],
  PRIVATE: visibility[1]
};

const constants = {
  Visibility: Visibility
};

class ActivitySchemaModel extends SchemaModel {
  constructor(MongoDb) {
    let schema = ActivitySchemaModel.getSchema();
    super(MongoDb, schema);
  }

  static get getSchema() {
    return {
      name: "activities",
      type: "collection",
      properties: {
        timestamp: {
          __type: "date",
          __default: "now",
          __allowUpdate: false
        },
        title: {
          __type: "string",
          __default: "",
          __allowUpdate: false
        },
        description: {
          __type: "string",
          __default: "",
          __allowUpdate: false
        },
        visibility: {
          __type: "string",
          __default: "private",
          __enum: visibility,
          __allowUpdate: false
        },
        path: {
          __type: "string",
          __default: "",
          __allowUpdate: false
        },
        verb: {
          __type: "string",
          __default: "",
          __allowUpdate: false
        },
        authLevel: {
          __type: "number",
          __default: 0,
          __allowUpdate: false
        },
        permissions: {
          __type: "string",
          __default: "",
          __allowUpdate: false
        },
        params: { },
        query: { },
        body: { },
        response: { },
        _token: {
          __type: "id",
          __required: true,
          __allowUpdate: false
        },
        _app: {
          __type: "id",
          __required: true,
          __allowUpdate: false
        },
        _user: {
          __type: "id",
          __required: true,
          __allowUpdate: false
        }
      }
    };
  }

  /**
   * @param {Object} body - body passed through from a POST request
   * @return {Promise} - fulfilled with App Object when the database request is completed
   */
  __add(body) {
    return prev => {
      let user = Model.authUser;
      let userName = user && user._person ? `${user._person.forename} ${user._person.surname}` : 'System';

      body.activityTitle = body.activityTitle.replace('%USER_NAME%', userName);
      body.activityDescription = body.activityDescription.replace('%USER_NAME%', userName);

      let q = Object.assign({}, body.req.query);
      delete q.token;
      delete q.urq;

      const md = {
        title: body.activityTitle,
        description: body.activityDescription,
        visibility: body.activityVisibility,
        path: body.path,
        verb: body.verb,
        permissions: body.permissions,
        authLevel: body.auth,
        params: body.req.params,
        query: q,
        body: body.req.body,
        // response: response,
        timestamp: new Date(),
        _token: Model.token.id,
        _user: (Model.authUser) ? Model.authUser.id : null,
        _app: Model.authApp.id
      };

      if (body.id) {
        md._id = new ObjectId(body.id);
      }

      const validated = Shared.applyAppProperties(false, body);
      return prev.concat([Object.assign(md, validated)]);
    };
  }

  findAll() {
    Logging.log(`getAll: ${Model.authApp._id}`, Logging.Constants.LogLevel.DEBUG);

    if (Model.token.authLevel === Model.Constants.Token.AuthLevel.SUPER) {
      return this.collection.find({});
    }

    return this.collection.find({
      _app: Model.authApp._id,
      visibility: constants.Visibility.PUBLIC
    });
  }

}

/**
 * Exports
 */
module.exports = ActivitySchemaModel;
