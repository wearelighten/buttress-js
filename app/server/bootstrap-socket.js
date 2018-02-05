'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file bootstrap-socket.js
 * @description Bootstrap the socket app
 * @module Model
 * @author Chris Bates-Keegan
 *
 */
const os = require('os');
const cluster = require('cluster');
const net = require('net');
const Express = require('express');
const sio = require('socket.io');
const sioRedis = require('socket.io-redis');
const sioEmitter = require('socket.io-emitter');

const Config = require('./config');
const Model = require('./model');
const Logging = require('./logging');
const MongoClient = require('mongodb').MongoClient;
const NRP = require('node-redis-pubsub');

/* ********************************************************************************
 *
 *
 *
 **********************************************************************************/
const processes = os.cpus().length;
const _workers = [];

/* ********************************************************************************
 *
 * HELPERS
 *
 **********************************************************************************/
const __indexFromIP = (ip, spread) => {
  let s = '';
  for (let i = 0, _len = ip.length; i < _len; i++) {
    if (!isNaN(ip[i])) {
      s += ip[i];
    }
  }

  return Number(s) % spread;
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
const __initMongoConnect = () => {
  return __nativeMongoConnect()
  .then(db => {
    Model.init(db);
    return db;
  })
  .catch(e => Logging.logError(e));
};

/* ********************************************************************************
 *
 * WORKERS
 *
 **********************************************************************************/
const __spawnWorkers = rooms => {
  Logging.log(`Spawning ${processes} Socket Workers`);

  const __spawn = idx => {
    _workers[idx] = cluster.fork();
    _workers[idx].send({'buttress:initAppNamespace': rooms});
  };

  for (let x = 0; x < processes; x++) {
    __spawn(x);
  }

  net.createServer({pauseOnConnect: true}, connection => {
    const worker = _workers[__indexFromIP(connection.remoteAddress, processes)];
    worker.send('buttress:connection', connection);
  }).listen(Config.listenPorts.sock);
};

const __initSocketNamespace = (io, name) => {
  const namespace = io.of(`/${name}`);

  namespace.on('connect', socket => {
    console.log(socket.handshake.query.token);
    console.log(`Connection to ${name}`);

    // Handle room assignment based on token

  });

  return namespace;
};

const __initWorker = () => {
  const app = new Express();
  const server = app.listen(0, 'localhost');
  const io = sio(server);
  const namespace = [];
  io.origins('*:*');
  io.adapter(sioRedis(Config.redis));

  process.on('message', (message, input) => {
    if (message === 'buttress:connection') {
      const connection = input;
      server.emit('connection', connection);
      connection.resume();
      return;
    }
    if (message['buttress:initAppNamespace']) {
      message['buttress:initAppNamespace'].forEach(name => {
        namespace.push(__initSocketNamespace(io, name));
      });
    }
  });
};

/* ********************************************************************************
 *
 * MASTER
 *
 **********************************************************************************/
const __initMaster = express => {
  const emitter = sioEmitter(Config.redis);
  const nrp = new NRP(Config.redis);
  const publicAppIds = [];

  const isPrimary = Config.sio.app === 'primary';

  if (isPrimary) {
    Logging.logDebug(`Primary Master`);
    nrp.on('activity', data => {
      Logging.logDebug(`Activity: ${data.path}`);
      emitter.emit('db-activity', data);
    });
  }

  __initMongoConnect()
  .then(db => {
    // Fetch all applications
    Model.App.findAll().toArray((err, apps) => {
      if (err) throw new Error(err);
      // Create Application rooms with user groups
      apps.forEach(app => {
        // TODO: Replace with correct name/token
        publicAppIds.push(Model.App.getPublicUID(app.name, app._token));
      });
      // Create workers, pass through room map
      __spawnWorkers(publicAppIds);
    });
  });
};

/* ********************************************************************************
 *
 * RHIZOME SOCKET
 *
 **********************************************************************************/
const _initSocketApp = () => {
  if (cluster.isMaster) {
    __initMaster();
  } else {
    __initWorker();
  }

  return Promise.resolve(cluster.isMaster);
};

/* ********************************************************************************
 *
 * EXPORTS
 *
 **********************************************************************************/
module.exports = {
  init: _initSocketApp
};
