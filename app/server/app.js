'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file app.js
 * @description
 * @module System
 * @author Chris Bates-Keegan
 *
 */

const express = require('express');
const methodOverride = require('method-override');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');
const Model = require('./model/index');
const Routes = require('./routes/index');
const Config = require('./config');
const Logging = require('./logging');

/**
 * Express
 */
var app = module.exports = express();

/**
 * Configuration
 */
var configureDevelopment = () => {
  Config.env = 'dev';
  app.set('db-uri', `mongodb://${Config.RHIZOME_MONGO_URL_DEV}/${Config.app.code}-dev`);
  app.use(morgan('short'));
  app.set('port', Config.listenPort.dev);
};

var configureProduction = () => {
  Config.env = 'prod';
  app.set('db-uri', `mongodb://${Config.RHIZOME_MONGO_URL_PROD}/${Config.app.code}-prod`);
  app.use(morgan('short'));
  app.set('port', Config.listenPort.prod);
};

var configureTest = () => {
  Config.env = 'test';
  app.set('db-uri', `mongodb://${Config.RHIZOME_MONGO_URL_TEST}/${Config.app.code}-test`);
  app.use(morgan('short'));
  app.set('port', Config.listenPort.test);
};

var configureApp = env => {
  app.enable('trust proxy', 1);
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: true}));
  app.use(methodOverride());

  app.use(express.static(`${Config.appDataPath}/public`));

  switch (env) {
    default:
    case 'development': {
      configureDevelopment();
    }
      break;
    case 'production': {
      configureProduction();
    }
      break;
    case 'test': {
      configureTest();
    }
      break;
  }
};

configureApp(app.get('env'));

/**
 *
 */
app.db = mongoose.connect(app.get('db-uri'));
app.db.connection.on('connected', () => {
  Logging.log(`${Config.app.title} listening on port ` +
              `${app.get('port')} in ${app.settings.env} mode.`, Logging.Constants.LogLevel.INFO);

  Model.init(app);
  Routes.init(app);

  app.server = app.listen(app.set('port'));
});
