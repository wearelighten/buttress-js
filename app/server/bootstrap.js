'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file config.js
 * @description
 * @module Config
 * @author Chris Bates-Keegan
 *
 */

var path = require('path');
var fs = require('fs');
var Config = require('./config');
var Model = require('./model');
var Routes = require('./routes');
var Logging = require('./logging');

var _installApp = (app, io) => {
  Model.init(app);
  return Routes
    .init(app, io)
    .then(() => {
      return Model.Organisation
        .find({});
    })
    .then(orgs => {
      if (orgs.length > 0) {
        return Promise.resolve(true); // If any organisations, assume we've got a Super Admin app
      }
      return Model.Organisation.add({
        name: 'Coders for Labour',
        type: Model.Constants.Organisation.Type.POLITICAL
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
        name: 'Rhizome Admin',
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
        name: 'Rhizome ADMIN',
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
    })
    .catch(Logging.Promise.logError());
};

module.exports = {
  app: _installApp
};
