'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file bootstrap.js
 * @description
 * @module System
 * @author Chris Bates-Keegan
 *
 */

const path = require('path');
const fs = require('fs');
const Config = require('./config');
const Model = require('./model');
const Routes = require('./routes');
const Logging = require('./logging');
const Helpers = require('./helpers');
const MongoClient = require('mongodb').MongoClient;

const __systemInit = () => {
  return Model.Organisation.find({})
    .then(orgs => {
      if (orgs.length > 0) {
        return Promise.resolve(true); // If any organisations, assume we've got a Super Admin app
      }
      return Model.Organisation.add({
        name: 'Lighten',
        type: Model.Constants.Organisation.Type.COMPANY
      });
    })
    .then(org => {
      if (org === true) {
        Logging.log('ORGANISATION EXISTED', Logging.Constants.LogLevel.SILLY);
        return Promise.resolve(true);
      }

      Logging.log('ORGANISATION ADDED', Logging.Constants.LogLevel.DEBUG);
      Logging.log(org.id, Logging.Constants.LogLevel.DEBUG);

      return Model.Group.add({
        name: 'ButtressJS Admin',
        type: Model.Constants.Group.Type.VOLUNTEERS,
        orgId: org.id
      });
    })
    .then(group => {
      if (group === true) {
        Logging.log('GROUP EXISTED', Logging.Constants.LogLevel.SILLY);
        return Promise.resolve(true);
      }
      Logging.log('GROUP ADDED', Logging.Constants.LogLevel.DEBUG);
      Logging.log(group.id, Logging.Constants.LogLevel.DEBUG);

      return Model.App.add({
        name: 'ButtressJS Admin',
        type: Model.Constants.App.Type.SERVER,
        authLevel: Model.Constants.Token.AuthLevel.SUPER,
        permissions: [{route: '*', permission: '*'}],
        domain: '',
        ownerGroupId: group.id
      });
    })
    .then(res => {
      if (res === true) {
        Logging.log('APP EXISTED', Logging.Constants.LogLevel.SILLY);
        return Promise.resolve(true);
      }
      Logging.log('APP ADDED', Logging.Constants.LogLevel.DEBUG);
      Logging.log(res.app.id, Logging.Constants.LogLevel.DEBUG);
      return new Promise((resolve, reject) => {
        var pathName = path.join(Config.appDataPath, 'super.json');
        var app = Object.assign(res.app.details, {token: res.token.value});
        fs.writeFile(pathName, JSON.stringify(app), err => {
          if (err) {
            return reject(err);
          }
          Logging.log(`Written ${pathName}`, Logging.Constants.LogLevel.VERBOSE);
          Logging.log(app, Logging.Constants.LogLevel.SILLY);

          resolve(true);
        });
      });
    });
};

const __nativeMongoConnect = app => {
  return new Promise((resolve, reject) => {
    MongoClient.connect(app.get('db-uri'), (err, db) => {
      if (err) throw err;
      Model.init(db);
      resolve();
    });
  });
};

const _installApp = (app, io) => {
  return __nativeMongoConnect(app)
    .then(() => {
      let tasks = [
        __nativeMongoConnect(app),
        Routes.init(app, io),
        __systemInit()
      ];

      return Promise.all(tasks);
    });
};

module.exports = {
  app: _installApp
};
