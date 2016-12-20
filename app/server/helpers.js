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

module.exports.Promise = {
  prop: prop => (val => val[prop]),
  func: func => (val => val[func]()),
  nop: () => (() => null),
  inject: value => (() => value),
  arrayProp: prop => (arr => arr.map(a => a[prop]))
};

