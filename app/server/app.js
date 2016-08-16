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

var express = require('express');
var json = require('express-json');
var methodOverride = require('method-override');
var morgan = require('morgan');
var mongoose = require('mongoose');
var Model = require('./model/index');
var Routes = require('./routes/index');
var Config = require('./config');

/**
 * Express
 */
var app = module.exports = express();

/**
 * Configuration
 */
var configureDevelopment = () => {
  Config.env = 'dev';
  app.set('db-uri', `mongodb://${Config.mongoUrl.dev}/${Config.app.code}-dev`);
  app.use(morgan('short'));
  app.set('port', Config.listenPort.dev);
};

var configureProduction = () => {
  Config.env = 'prod';
  app.set('db-uri', `mongodb://${Config.mongoUrl.dev}/${Config.app.code}-prod`);
  app.use(morgan('short'));
  app.set('port', Config.listenPort.prod);
};

var configureTest = () => {
  Config.env = 'test';
  app.set('db-uri', `mongodb://${Config.mongoUrl.test}/${Config.app.code}-test`);
  app.use(morgan('short'));
  app.set('port', Config.listenPort.test);
};

var configureApp = env => {
  app.enable('trust proxy', 1);
  app.use(json());
  app.use(methodOverride());

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
  console.log(`${Config.app.title} listening on port %d in %s mode.`, app.get('port'), app.settings.env);

  Model.init();
  Routes.init(app);
  app.server = app.listen(app.set('port'));
});
