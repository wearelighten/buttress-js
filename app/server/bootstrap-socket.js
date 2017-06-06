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
const NRP = require('node-redis-pubsub');
const Config = require('./config');
const Logging = require('./logging');

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
  Logging.log(`Spawning ${processes} Socket Workers`);

  const __spawn = idx => {
    _workers[idx] = cluster.fork();
  };

  for (let x = 0; x < processes; x++) {
    __spawn(x);
  }
};

const __indexFromIP = (ip, spread) => {
  let s = '';
  for (let i = 0, _len = ip.length; i < _len; i++) {
    if (!isNaN(ip[i])) {
      s += ip[i];
    }
  }

  return Number(s) % spread;
};

const __initWorker = () => {
  const app = new Express();
  const server = app.listen(0, 'localhost');
  const io = sio(server);
  io.origins('*:*');
  io.adapter(sioRedis(Config.redis));

  process.on('message', (message, connection) => {
    if (message !== 'sticky-session:connection') {
      return;
    }

    server.emit('connection', connection);
    connection.resume();
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

  const isPrimary = Config.sio.app === 'primary';
  if (isPrimary) {
    Logging.logDebug(`Primary Master`);
    nrp.on('activity', data => {
      Logging.logDebug(`Activity: ${data.path}`);
      emitter.emit('db-activity', data);
    });
  }

  __spawnWorkers();

  net.createServer({pauseOnConnect: true}, connection => {
    const worker = _workers[__indexFromIP(connection.remoteAddress, processes)];
    worker.send('sticky-session:connection', connection);
  }).listen(Config.socket.listenPort);
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
