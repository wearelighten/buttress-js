'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file token.js
 * @description Token definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

const Crypto = require('crypto');
const SchemaModel = require('../schemaModel');
const ObjectId = require('mongodb').ObjectId;
const Shared = require('../shared');
const Logging = require('../../logging');

/**
 * Constants
*/
const type = ['app', 'user'];
const Type = {
  APP: type[0],
  USER: type[1]
};

const authLevel = [0, 1, 2, 3];
const AuthLevel = {
  NONE: 0,
  USER: 1,
  ADMIN: 2,
  SUPER: 3
};

class TokenSchemaModel extends SchemaModel {
  constructor(MongoDb) {
    const schema = TokenSchemaModel.Schema;
    super(MongoDb, schema);
  }

  static get Constants() {
    return {
      Type: Type,
      AuthLevel: AuthLevel
    };
  }
  get Constants() {
    return TokenSchemaModel.Constants;
  }

  static get Schema() {
    return {
      name: "tokens",
      type: "collection",
      collection: "tokens",
      extends: [],
      properties: {
        type: {
          __type: "string",
          __default: "user",
          __enum: type,
          __allowUpdate: true
        },
        value: {
          __type: "string",
          __default: "",
          __required: true,
          __allowUpdate: true
        },
        domains: {
          __type: "array",
          __required: true,
          __allowUpdate: true
        },
        authLevel: {
          __type: "number",
          __default: 1,
          __enum: authLevel,
          __allowUpdate: true
        },
        permissions: {
          __type: "array",
          __required: true,
          __allowUpdate: true,
          __schema: {
            route: {
              __type: "string",
              __required: true,
              __allowUpdate: true
            },
            permission: {
              __type: "string",
              __required: true,
              __allowUpdate: true
            }
          }
        },
        uses: {
          __type: "array",
          __required: true,
          __allowUpdate: true
        },
        allocated: {
          __type: Boolean,
          __default: false,
          __required: true,
          __allowUpdate: true
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
   * @return {string} - cryptographically secure token string
   * @private
   */
  _createTokenString() {
    const length = 36;
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var mask = 0x3d;
    var string = '';

    try {
      var bytes = Crypto.randomBytes(length);
      for (var x = 0; x < bytes.length; x++) {
        var byte = bytes[x];
        string += chars[byte & mask];
      }
    } catch (err) {
      throw err;
    }

    Logging.log(`Created Token: ${string}`, Logging.Constants.LogLevel.VERBOSE);

    return string;
  }

  /*
    * @param {Object} body - body passed through from a POST request
    * @return {Promise} - returns a promise that is fulfilled when the database request is completed
    */
  add(body, internals) {
    body.value = this._createTokenString();
    return super.add(body, internals);
  }

  /**
   * @param {string} route - route for the permission
   * @param {*} permission - permission to apply to the route
   * @return {Promise} - resolves when save operation is completed, rejects if metadata already exists
   */
  addOrUpdatePermission(route, permission) {
    Logging.log(route, Logging.Constants.LogLevel.DEBUG);
    Logging.log(permission, Logging.Constants.LogLevel.DEBUG);

    var exists = this.permissions.find(p => p.route === route);
    if (exists) {
      exists.permission = permission;
    } else {
      this.permissions.push({route, permission});
    }
    return this.save();
  }

  /**
   * @param {String} userId - DB id for the user
   * @param {String} appId - DB id for the app
   * @return {Promise} - resolves to an array of Tokens (native Mongoose objects)
   */
  findUserAuthToken(userId, appId) {
    return new Promise(resolve => {
      this.collection.findOne({
        allocated: true,
        _app: appId,
        _user: userId
      }, {}, (err, doc) => {
        if (err) throw err;
        resolve(doc);
      });
    });
  }
}

/**
 * Schema Virtual Methods
 */
// schema.virtual('details').get(function() {
//   return {
//     id: this._id,
//     type: this.type,
//     app: this.app,
//     user: this.user,
//     authLevel: this.authLevel,
//     domains: this.domains,
//     permissions: this.permissions.map(p => {
//       return {route: p.route, permission: p.permission};
//     })
//   };
// });

/**
 * Exports
 */
module.exports = TokenSchemaModel;
