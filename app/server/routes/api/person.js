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
      if (!this.req.body.name ||
          !this.req.body.email) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }

      resolve(true);
    });
  }

  _exec() {
    return Model.Person.add(this.req.body, this.req.authApp._owner)
      .then(Logging.Promise.logProp('Added Person', 'forename', Route.LogLevel.VERBOSE));

    // return new Promise((resolve, reject) => {
    //   Model.Person.add(this.req.body, this.req.appAuth._owner)
    //     .then(Logging.Promise.logProp('Added Person', 'forename', Route.LogLevel.VERBOSE))
    //     .then(resolve, reject);
    // });
  }
}
routes.push(AddPerson);

/**
 * @class DeleteAllPeople
 */
class DeleteAllPeople extends Route {
  constructor() {
    super('person', 'DELETE ALL PEOPLE');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._person = false;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Person.rmAll().then(() => true);
  }
}
routes.push(DeleteAllPeople);

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
      Model.Person
        .findById(this.req.params.id)
        .then(person => {
          if (!person) {
            this.log('ERROR: Invalid Person ID', Route.LogLevel.ERR);
            reject({statusCode: 400, message: `ERROR: Invalid Person ID: ${this.req.params.id}`});
            return;
          }
          this._person = person;
          resolve(true);
        }, err => reject({statusCode: 400, message: err.message}));
    });
  }

  _exec() {
    return this._person.rm().then(() => true);
  }
}
routes.push(DeletePerson);

/**
 * @class AddPersonMetadata
 */
class AddPersonMetadata extends Route {
  constructor() {
    super('person/:id/metadata/:key', 'ADD PERSON METADATA');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._person = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Person.findById(this.req.params.id).then(person => {
        if (!person) {
          this.log('ERROR: Invalid Person ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        try {
          JSON.parse(this.req.body.value);
        } catch (e) {
          this.log(`ERROR: ${e.message}`, Route.LogLevel.ERR);
          this.log(this.req.body.value, Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }

        this._person = person;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._person.addOrUpdateMetadata(this.req.params.key, this.req.body.value);
  }
}
routes.push(AddPersonMetadata);

/**
 * @class UpdatePersonMetadata
 */
class UpdatePersonMetadata extends Route {
  constructor() {
    super('person/:id/metadata/:key', 'UPDATE PERSON METADATA');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._app = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Person.findById(this.req.params.id).then(person => {
        if (!person) {
          this.log('ERROR: Invalid Person ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (person.findMetadata(this.req.params.key) === false) {
          this.log('ERROR: Metadata does not exist', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        try {
          JSON.parse(this.req.body.value);
        } catch (e) {
          this.log(`ERROR: ${e.message}`, Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }

        this._person = person;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._person.addOrUpdateMetadata(this.req.params.key, this.req.body.value);
  }
}
routes.push(UpdatePersonMetadata);

/**
 * @class GetPersonMetadata
 */
class GetPersonMetadata extends Route {
  constructor() {
    super('person/:id/metadata/:key', 'GET PERSON METADATA');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.GET;

    this._metadata = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Person.findById(this.req.params.id).then(person => {
        if (!person) {
          this.log('ERROR: Invalid Person ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }

        this._metadata = person.findMetadata(this.req.params.key);
        if (this._metadata === false) {
          this.log('WARN: Person Metadata Not Found', Route.LogLevel.ERR);
          reject({statusCode: 404});
          return;
        }

        resolve(true);
      });
    });
  }

  _exec() {
    return this._metadata.value;
  }
}
routes.push(GetPersonMetadata);

/**
 * @class DeletePersonMetadata
 */
class DeletePersonMetadata extends Route {
  constructor() {
    super('person/:id/metadata/:key', 'DELETE PERSON METADATA');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._person = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Person
        .findById(this.req.params.id).select('id')
        .then(person => {
          if (!person) {
            this.log('ERROR: Invalid Person ID', Route.LogLevel.ERR);
            reject({statusCode: 400, message: `Invalid Person ID: ${this.req.params.id}`});
            return;
          }
          this._person = person;
          resolve(true);
        }, err => reject({statusCode: 400, message: err.message}));
    });
  }

  _exec() {
    return this._person.rmMetadata(this.req.params.key);
  }
}
routes.push(DeletePersonMetadata);

/**
 * @type {*[]}
 */
module.exports = routes;
