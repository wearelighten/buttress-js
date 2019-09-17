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

const BootstrapRest = require('./bootstrap-rest');
const BootstrapSocket = require('./bootstrap-socket');

/* ********************************************************************************
 *
 * EXPORTS
 *
 **********************************************************************************/
module.exports = {
	rest: () => new BootstrapRest(),
	socket: () => new BootstrapSocket(),
};
