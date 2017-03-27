'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file app.js
 * @description
 * @module System
 * @author Chris Bates-Keegan
 *
 */

const express = require('express');
const app = module.exports = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const methodOverride = require('method-override');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');
const Bootstrap = require('./bootstrap');
const Config = require('./config');
const Logging = require('./logging');

/**
 * Configuration
 */
const configureDevelopment = () => {
  Config.env = 'dev';
  app.set('db-uri', `mongodb://${Config.BUTTRESS_MONGO_URL_DEV}/${Config.app.code}-dev`);
  app.use(morgan('short'));
  app.set('port', Config.listenPort);
};

const configureProduction = () => {
  Config.env = 'prod';
  app.set('db-uri', `mongodb://${Config.BUTTRESS_MONGO_URL_PROD}/${Config.app.code}-prod`);
  app.use(morgan('short'));
  app.set('port', Config.listenPort);
};

const configureTest = () => {
  Config.env = 'test';
  app.set('db-uri', `mongodb://${Config.BUTTRESS_MONGO_URL_TEST}/${Config.app.code}-test`);
  app.use(morgan('short'));
  app.set('port', Config.listenPort);
};

const configureApp = env => {
  app.enable('trust proxy', 1);
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: true}));
  app.use(methodOverride());

  app.use(express.static(`${Config.appDataPath}/public`));

  switch (env) {
    default:
      break;
    case 'development':
      configureDevelopment();
      break;
    case 'production':
      configureProduction();
      break;
    case 'test':
      configureTest();
      break;
  }
};

configureApp(app.get('env'));

/**
 *
 */
app.db = mongoose.connect(app.get('db-uri'));
app.db.connection.on('connected', () => {
  Bootstrap
    .app(app, io)
    .then(() => {
      Logging.log(`${Config.app.title} listening on port ` +
        `${app.get('port')} in ${app.settings.env} mode.`, Logging.Constants.LogLevel.INFO);
      app.server = server.listen(app.set('port'));
    })
    .catch(Logging.Promise.logError());
});
