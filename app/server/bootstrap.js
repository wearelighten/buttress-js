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

const Rest = require('./bootstrap-rest');
const Socket = require('./bootstrap-socket');

/* ********************************************************************************
 *
 * EXPORTS
 *
 **********************************************************************************/
module.exports = {
  rest: Rest.init,
  socket: Socket.init
};
