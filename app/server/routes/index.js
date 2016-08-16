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

var utils = require('util');
var fs = require('fs');
var path = require('path');
// var express = require('express');
// var app = express();

/**
 * @param {Object} app - express app object
 * @param {string} name - name of the route
 * @param {string} verb - http verb
 * @param {Object} Command - Route handler object (extends Route)
 * @private
 */
function _initCommand(app, name, verb, Command) {
  app[verb](`/api/v1/${name}`, (req, res) => {
    (new Command(req, res)).exec().done(
      result => {
        console.log(result);
        res.json(result);
      }
    , error => {
      var status = false;
      if (error.authFailure === true) {
        status = 401;
      }
      if (status === false && error.missingResource === true) {
        status = 404;
      }
      if (status === false && error.validationFailure === true) {
        status = 400;
      }
      if (status === false && utils.isError(error) !== true) {
        status = 500;
      }
      if (status !== false) {
        res.sendStatus(status);
        return;
      }
      res.status(500).json(error);
    });
  });
}

/**
 *
 * @param {Object} app - express app object
 */
exports.init = app => {
  var providers = _getRouteProviders();
  for (var x = 0; x < providers.length; x++) {
    var routes = providers[x].routes;
    for (var name in routes) {
      if ({}.hasOwnProperty.call(routes, name) !== true) {
        continue;
      }
      var route = routes[name];
      for (var verb in route) {
        if ({}.hasOwnProperty.call(route, verb) !== true) {
          continue;
        }
        _initCommand(app, name, verb, route[verb]);
      }
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
