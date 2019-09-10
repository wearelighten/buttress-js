'use strict';

/**
 * ButtressJS - Realtime datastore for software
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
	rest: () => new Rest(),
	socket: Socket.init,
};
