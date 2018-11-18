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

var crypto = require('crypto');
const SchemaModel = require('../schemaModel');
var Logging = require('../../logging');
var Model = require('../');

const collectionName = 'tokens';
const collection = Model.mongoDb.collection(collectionName);

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

const constants = {
  Type: Type,
  AuthLevel: AuthLevel
};

class TokenSchemaModel extends SchemaModel {
  constructor(MongoDb) {
    let schema = TokenSchemaModel.getSchema();
    super(MongoDb, schema);
  }

  static get getSchema() {
    return {
      name: "app",
      type: "collection",
      properties: {
        name: {
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
            value: {
              __type: "string",
              __required: true,
              __allowUpdate: true
            },
            permission: {
              __type: "string",
              __required: true,
              __allowUpdate: true
            },
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
      var bytes = crypto.randomBytes(length);
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

  /**
   * @param {Object} details - type, app, user, authLevel, permissions
   * @return {Promise} - returns a promise that is fulfilled when the database request is completed
   */
  add(details) {
    Logging.logDebug(`Add User Token: ${details.user ? details.user._id : false}`);

    var token = new ModelDef({
      // _id: details.id,
      type: details.type,
      value: this._createTokenString(),
      _app: details.app,
      _user: details.user,
      domains: details.domains,
      authLevel: details.authLevel,
      permissions: details.permissions,
      allocated: true
    });

    return token.save();
  }

  /**
   * Schema Methods
   */

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
   * Schema Static Methods
   */

  findAll() {
    return collection.find({});
  }

  /**
   * @return {Promise} - resolves to an array of Tokens (native Mongoose objects)
   */
  findAllNative() {
    return ModelDef.find({allocated: true}).populate('_app').populate({path: '_user', populate: {path: '_person'}});
  }

  /**
   * @param {String} userId - DB id for the user
   * @param {String} appId - DB id for the app
   * @return {Promise} - resolves to an array of Tokens (native Mongoose objects)
   */
  findUserAuthToken(userId, appId) {
    return ModelDef.findOne({allocated: true, _app: appId, _user: userId});
  }

  /**
   * @param {Enum} type - OPTIONAL 'app' or 'user'
   * @return {Promise} - resolves when done
   */
  rmAll(type) {
    return ModelDef.remove({type: type}).then(r => true);
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
