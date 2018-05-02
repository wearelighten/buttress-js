'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file bootstrap-rest.js
 * @description
 * @module Config
 * @author Chris Bates-Keegan
 *
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const cluster = require('cluster');
const express = require('express');
const methodOverride = require('method-override');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const Config = require('./config');
const Model = require('./model');
const Routes = require('./routes');
const Logging = require('./logging');
const MongoClient = require('mongodb').MongoClient;
const NRP = require('node-redis-pubsub');

Error.stackTraceLimit = Infinity;

/* ********************************************************************************
 *
 *
 *
 **********************************************************************************/
const processes = os.cpus().length;
const _workers = [];

/* ********************************************************************************
 *
 * WORKERS
 *
 **********************************************************************************/
const __spawnWorkers = () => {
  Logging.logVerbose(`Spawning ${processes} REST Workers`);

  const __spawn = idx => {
    _workers[idx] = cluster.fork();
  };

  for (let x = 0; x < processes; x++) {
    __spawn(x);
  }
};

/* ********************************************************************************
 *
 * INSTALL
 *
 **********************************************************************************/
const __systemInstall = () => {
  return Model.Organisation.find({})
    .then(orgs => {
      if (orgs.length > 0) {
        return true; // If any organisations, assume we've got a Super Admin app
      }
      return Model.Organisation.add({
        name: 'Lighten',
        type: Model.Constants.Organisation.Type.COMPANY
      });
    })
    .then(org => {
      if (org === true) {
        Logging.logSilly('ORGANISATION EXISTED');
        return true;
      }

      Logging.logDebug('ORGANISATION ADDED');
      Logging.logDebug(org.id);

      return Model.Group.add({
        name: 'Rhizome Admin',
        type: Model.Constants.Group.Type.STAFF,
        orgId: org.id
      });
    })
    .then(group => {
      if (group === true) {
        Logging.logSilly('GROUP EXISTED');
        return true;
      }
      Logging.logDebug('GROUP ADDED');
      Logging.logDebug(group.id);

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
        Logging.logSilly('APP EXISTED');
        return true;
      }
      Logging.logDebug('APP ADDED');
      Logging.logDebug(res.app.id);
      return new Promise((resolve, reject) => {
        let pathName = path.join(Config.paths.appData, 'super.json');
        let app = Object.assign(res.app.details, {token: res.token.value});
        fs.writeFile(pathName, JSON.stringify(app), err => {
          if (err) {
            return reject(err);
          }
          Logging.logVerbose(`Written ${pathName}`);
          Logging.logSilly(app);

          resolve(true);
        });
      });
    });
};

/* ********************************************************************************
 *
 * MONGODB
 *
 **********************************************************************************/
const POOL_SIZE = 10;
const __nativeMongoConnect = app => {
  const mongoUrl = `mongodb://${Config.mongoDb.url}`;
  const dbName = `${Config.app.code}-${Config.env}`;
  return MongoClient.connect(mongoUrl, {poolSize: POOL_SIZE, native_parser: true})
  .then(client => {
    return client.db(dbName);
  });
};

/* ********************************************************************************
 *
 * WORKER
 *
 **********************************************************************************/
const __initWorker = () => {
  let app = express();
  app.use(morgan('short'));
  app.enable('trust proxy', 1);
  app.use(bodyParser.json({limit: '20mb'}));
  app.use(bodyParser.urlencoded({extended: true}));
  app.use(methodOverride());
  app.use(express.static(`${Config.paths.appData}/public`));

  process.on('unhandledRejection', error => {
    Logging.logError(error);
  });

  process.on('message', payload => {
    Logging.logDebug(`App Metadata Changed: ${payload.appId}`);
    Model.appMetadataChanged = true;
  });

  return __nativeMongoConnect()
    .then(db => {
      Model.init(db);

      let tasks = [
        Routes.init(app)
      ];

      app.listen(Config.listenPorts.rest);

      return Promise.all(tasks);
    })
    .catch(Logging.Promise.logError());
};

/* ********************************************************************************
 *
 * MASTER
 *
 **********************************************************************************/
const __initMaster = () => {
  const isPrimary = Config.rest.app === 'primary';
  let p = Promise.resolve();

  if (isPrimary) {
    Logging.logVerbose(`Primary Master REST`);
    p = __nativeMongoConnect()
      .then(db => {
        Model.init(db);
        return __systemInstall();
      })
      .catch(e => Logging.logError(e));
  } else {
    Logging.logVerbose(`Secondary Master REST`);
  }

  const nrp = new NRP(Config.redis);
  nrp.on('app-metadata:changed', data => {
    Logging.logDebug(`App Metadata Changed: ${data.appId}, ${_workers.length} Workers`);
    _workers.forEach(w => {
      w.send({
        appId: data.appId
      });
    });
  });

  p.then(__spawnWorkers);

  return Promise.resolve();
};

/* ********************************************************************************
 *
 * RHIZOME REST
 *
 **********************************************************************************/
const _initRestApp = () => {
  let p = null;
  if (cluster.isMaster) {
    p = __initMaster();
  } else {
    p = __initWorker();
  }

  return p.then(() => cluster.isMaster);
};

/* ********************************************************************************
 *
 * EXPORTS
 *
 **********************************************************************************/
module.exports = {
  init: _initRestApp
};
