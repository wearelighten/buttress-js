'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file helpers.js
 * @description Helpers
 * @module System
 * @author Chris Bates-Keegan
 *
 */

module.exports.Promise = {};

module.exports.Promise.prop = prop => (val => val[prop]);
module.exports.Promise.func = func => (val => val[func]());
module.exports.Promise.nop = () => (() => null);

