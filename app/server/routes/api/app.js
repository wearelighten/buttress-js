'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file index.js
 * @description Model management
 * @module Model
 * @author Chris Bates-Keegan
 *
 */

var Route = require('../route');

/**
 * @class GetList
 */
class GetList extends Route {
  constructor(req, res) {
    super(req, res, 'APP GET');
  }

  _validate() {
    var d = new Promise((resolve, reject) => {
      resolve(true);
    });

    return d;
  }

  _exec() {
    var d = new Promise((resolve, reject) => {
      resolve(['a', 'b', 'c']);
    });

    return d;
  }
}

/**
 *
 * @type {{routes: {app: {get: GetList}}}}
 */
module.exports = {
  routes: {
    app: {
      get: GetList
    }
  }
};
