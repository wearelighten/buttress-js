'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file app.js
 * @description App model definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

// const mongoose = require('mongoose');

/**
 * Constants
*/

const apps = ['google', 'facebook', 'twitter', 'linkedin'];
const App = {
  GOOGLE: apps[0],
  FACEBOOK: apps[1],
  TWITTER: apps[2],
  LINKEDIN: apps[3]
};

const constants = {
  App: App
};

const schema = new mongoose.Schema({
  app: String,
  appId: String,
  username: String,
  profileUrl: String,
  images: {
    profile: String,
    banner: String
  },
  email: String,
  locale: String,
  token: String,
  tokenSecret: String,
  refreshToken: String,
  extras: String
});
schema.set('bufferCommands', false);

let ModelDef = null;

/**
 * Schema Virtual Methods
 */
schema.virtual('details').get(function() {
  return {
    app: this.app,
    appId: this.appId,
    username: this.username,
    token: this.token,
    tokenSecret: this.tokenSecret,
    refreshToken: this.refreshToken,
    profileUrl: this.profileUrl,
    images: this.images,
    email: this.email
  };
});
/**
 * Schema Static Methods
 */

ModelDef = mongoose.model('AppAuth', schema);

/**
 * Exports
 */
module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;
