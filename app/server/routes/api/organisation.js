'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file organisation.js
 * @description Organisation API specification
 * @module API
 * @author Chris Bates-Keegan
 *
 */

var Route = require('../route');
var Model = require('../../model');
var Helpers = require('../../helpers');
var Logging = require('../../logging');

var routes = [];

/**
 * @class GetOrgList
 */
class GetOrgList extends Route {
  constructor() {
    super('org', 'GET ORG LIST');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.LIST;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      resolve(true);
    });
  }

  _exec() {
    return Model.Organisation.findAll()
      .then(Helpers.Promise.arrayProp('details'));
  }
}
routes.push(GetOrgList);

/**
 * @class GetOrg
 */
class GetOrg extends Route {
  constructor() {
    super('org/:id', 'GET ORG');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.READ;

    this._org = false;
    this._groups = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Organisation.findById(this.req.params.id)
        .then(org => {
          if (!org) {
            this.log('ERROR: Invalid Organisation ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._org = org;
          return org;
        })
        .then(Logging.Promise.log('Org', Route.LogLevel.VERBOSE))
        .then(org => Model.Group.find({_organisation: org._id}))
        .then(Logging.Promise.log('Groups', Route.LogLevel.VERBOSE))
        .then(groups => {
          this._groups = groups;
          resolve(true);
        });
    });
  }

  _exec() {
    return new Promise((resolve, reject) => {
      resolve(Object.assign(this._org.details, {groups: this._groups.map(g => g.details)}));
    });
  }
}
routes.push(GetOrg);

/**
 * @class AddOrg
 */
class AddOrg extends Route {
  constructor() {
    super('org', 'ADD ORG');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.body.name || !this.req.body.type || !this.req.body.website) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }

      Model.Organisation.isDuplicate()
        .then(res => {
          if (res === true) {
            this.log('ERROR: Duplication organisation', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          resolve(true);
        });
    });
  }

  _exec() {
    return Model.Organisation.add(this.req.body)
        .then(Logging.Promise.logProp('Added Org', 'name', Route.LogLevel.VERBOSE))
        .then(Helpers.Promise.prop('details'));
  }
}
routes.push(AddOrg);

/**
 * @class UpdateOrg
 */
class UpdateOrg extends Route {
  constructor() {
    super('org/:id', 'UPDATE ORG');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.WRITE;
    this._org = null;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.body.name && !this.req.body.type && !this.req.body.website) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }

      Model.Organisation.findById(this.req.params.id)
      .then(org => {
        if (!org) {
          this.log('ERROR: Invalid Organisation ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        this.log(org._id);
        this._org = org;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._org.update(this.req.body)
        .then(Helpers.Promise.prop('details'));
  }
}
routes.push(UpdateOrg);

/**
 * @class DeleteOrg
 */
class DeleteOrg extends Route {
  constructor() {
    super('org/:id', 'DELETE ORG');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._org = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Organisation.findById(this.req.params.id)
        .then(org => {
          if (!org) {
            this.log('ERROR: Invalid Organisation ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._org = org;
          return org;
        })
        // .then(Logging.Promise.log('Org', Route.LogLevel.VERBOSE))
        .then(org => {
          org.findGroups()
            .then(Logging.Promise.log('Groups'), Route.LogLevel.VERBOSE)
            .then(groups => {
              if (groups.length > 0) {
                this.log('ERROR: Delete child groups before deleting the org', Route.LogLevel.ERR);
                reject({statusCode: 400});
                return;
              }
              resolve(true);
            });
        });
    });
  }

  _exec() {
    return new Promise((resolve, reject) => {
      Model.Organisation.rm(this._org).then(() => true).then(resolve, reject);
    });
  }
}
routes.push(DeleteOrg);

/**
 * @class DeleteAllOrganisations
 */
class DeleteAllOrganisations extends Route {
  constructor() {
    super('org', 'DELETE ALL ORGS');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.DELETE;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Organisation.rmAll().then(() => true);
  }
}
routes.push(DeleteAllOrganisations);

/**
 * @type {*[]}
 */
module.exports = routes;
