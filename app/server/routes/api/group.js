'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file group.js
 * @description Group API specification
 * @module API
 * @author Chris Bates-Keegan
 *
 */

var Route = require('../route');
var Model = require('../../model');
var Logging = require('../../logging');

var routes = [];

/**
 * @class GetGroupList
 */
class GetGroupList extends Route {
  constructor() {
    super('group', 'GET GROUP LIST');
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
    return new Promise((resolve, reject) => {
      Model.Group.findAll().then(resolve, reject);
    });
  }
}
routes.push(GetGroupList);

/**
 * @class GetGroup
 */
class GetGroup extends Route {
  constructor() {
    super('group/:id', 'GET GROUP');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.READ;

    this._group = false;
    this._apps = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.params.id) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }
      Model.Group.findById(this.req.params.id).populate('_organisation')
        .then(Logging.Promise.log('Group', Route.LogLevel.VERBOSE))
        .then(group => {
          if (!group) {
            this.log('ERROR: Invalid Group ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._group = group;
          return group;
        })
        .then(group => Model.App.find({_owner: group._id}))
        .then(Logging.Promise.logArray('Apps', Route.LogLevel.VERBOSE))
        .then(apps => {
          this._apps = apps;
          resolve(true);
        });
    });
  }

  _exec() {
    return new Promise((resolve, reject) => {
      resolve(Object.assign(this._group.details, {apps: this._apps.map(m => m.details)}));
    });
  }
}
routes.push(GetGroup);

/**
 * @class AddGroup
 */
class AddGroup extends Route {
  constructor() {
    super('group', 'ADD GROUP');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._org = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.body.name || !this.req.body.orgId || !this.req.body.type || !this.req.body.website) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }

      Model.Organisation.findById(this.req.body.orgId).then(org => {
        if (!org) {
          this.log('ERROR: Invalid Group ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        this._org = org;
      }).then(() => {
        Model.Group.isDuplicate(this.req.body.name).then(res => {
          if (res === true) {
            this.log('ERROR: Duplicate Group', Route.LogLevel.ERR);
            reject({statusCode: 400});
          }
        });
        resolve(true);
      });
    });
  }

  _exec() {
    return new Promise((resolve, reject) => {
      Model.Group.add(this.req.body)
        .then(Logging.Promise.logProp('Added Group', 'name', Route.LogLevel.VERBOSE))
        .then(resolve, reject);
    });
  }
}
routes.push(AddGroup);

/**
 * @class DeleteGroup
 */
class DeleteGroup extends Route {
  constructor() {
    super('group/:id', 'DELETE GROUP');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._group = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.params.id) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }
      Model.Group.findById(this.req.params.id)
        .then(group => {
          if (!group) {
            this.log('ERROR: Invalid Group ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._group = group;
          return group;
        })
        .then(Logging.Promise.log('Delete Group', Route.LogLevel.VERBOSE))
        .then(group => Model.App.find({_owner: group._id}))
        .then(Logging.Promise.logArray('Apps', Route.LogLevel.VERBOSE))
        .then(apps => {
          if (apps.length > 0) {
            this.log('ERROR: Invalid Group ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
          }
          resolve(true);
        });
    });
  }

  _exec() {
    return new Promise((resolve, reject) => {
      Model.Group.rm(this._group).then(() => true).then(resolve, reject);
    });
  }
}
routes.push(DeleteGroup);

/**
 * @type {*[]}
 */
module.exports = routes;
