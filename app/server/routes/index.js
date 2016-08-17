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

var fs = require('fs');
var path = require('path');
var Route = require('./route');

/**
 * @param {Object} app - express app object
 * @param {Object} Route - route object
 * @private
 */
function _initRoute(app, Route) {
  var route = new Route();
  app[route.verb](`/api/v1/${route.path}`, (req, res) => {
    route.exec(req, res)
      .then(result => res.json(result),
            error => res.sendStatus(error.statusCode));
  });
}

/**
 *
 * @param {Object} app - express app object
 */
exports.init = app => {
  Route.app = app;

  var providers = _getRouteProviders();
  for (var x = 0; x < providers.length; x++) {
    var routes = providers[x];
    for (var y = 0; y < routes.length; y++) {
      var route = routes[y];
      _initRoute(app, route);
    }
  }
};

/**
 * @return {Array} - returns an array of Route handlers
 * @private
 */
function _getRouteProviders() {
  var filenames = fs.readdirSync(`${__dirname}/api`);

  var files = [];
  for (var x = 0; x < filenames.length; x++) {
    var file = filenames[x];
    if (path.extname(file) === '.js') {
      files.push(require(`./api/${path.basename(file, '.js')}`));
    }
  }

  return files;
}
