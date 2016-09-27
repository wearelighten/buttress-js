'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file person.js
 * @description Person API specification
 * @module API
 * @author Chris Bates-Keegan
 *
 */

var Route = require('../route');
var Model = require('../../model');
var Logging = require('../../logging');

var routes = [];

/**
 * @class GetPersonList
 */
class GetPersonList extends Route {
  constructor() {
    super('person', 'GET PERSON LIST');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.USER;
    this.permissions = Route.Constants.Permissions.LIST;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      resolve(true);
    });
  }

  _exec() {
    return new Promise((resolve, reject) => {
      Model.Person.findAll().then(resolve, reject);
    });
  }
}
routes.push(GetPersonList);

/**
 * @class GetPerson
 */
class GetPerson extends Route {
  constructor() {
    super('person/:id', 'GET PERSON');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.READ;

    this._person = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.params.id) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }
      Model.Person.findById(this.req.params.id).then(person => {
        if (!person) {
          this.log('ERROR: Invalid Person ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        this._person = person;
        resolve(true);
      });
    });
  }

  _exec() {
    return new Promise((resolve, reject) => {
      resolve(this._person.details);
    });
  }
}
routes.push(GetPerson);

/**
 * @class AddPerson
 */
class AddPerson extends Route {
  constructor() {
    super('person', 'ADD PERSON');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.USER;
    this.permissions = Route.Constants.Permissions.ADD;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.body.forename ||
          !this.req.body.surname ||
          !this.req.body.email) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }

      resolve(true);
    });
  }

  _exec() {
    return new Promise((resolve, reject) => {
      Model.Person.add(this.req.body, this.req.appDetails._owner)
        .then(Logging.Promise.logProp('Added Person', 'forename', Route.LogLevel.VERBOSE))
        .then(resolve, reject);
    });
  }
}
routes.push(AddPerson);

/**
 * @class DeletePerson
 */
class DeletePerson extends Route {
  constructor() {
    super('person/:id', 'DELETE PERSON');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._person = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.params.id) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }
      Model.Person.findById(this.req.params.id).then(person => {
        if (!person) {
          this.log('ERROR: Invalid Person ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        this._person = person;
        resolve(true);
      });
    });
  }

  _exec() {
    return new Promise((resolve, reject) => {
      Model.Person.rm(this._person).then(() => true).then(resolve, reject);
    });
  }
}
routes.push(DeletePerson);

/**
 * @type {*[]}
 */
module.exports = routes;
