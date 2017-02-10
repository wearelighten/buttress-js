'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file task.js
 * @description Company API specification
 * @module API
 * @author Chris Bates-Keegan
 *
 */

const Route = require('../route');
const Model = require('../../model');
const Helpers = require('../../helpers');
const Logging = require('../../logging');

let routes = [];

/**
 * @class GetTaskList
 */
class GetTaskList extends Route {
  constructor() {
    super('task', 'GET TASK LIST');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.LIST;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Task.getAll()
      .then(Helpers.Promise.arrayProp('details'));
  }
}
routes.push(GetTaskList);

/**
 * @class GetTask
 */
class GetTask extends Route {
  constructor() {
    super('task/:id', 'GET TASK');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.READ;

    this._task = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Task.findById(this.req.params.id)
        .then(task => {
          if (!task) {
            this.log('ERROR: Invalid Task ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._task = task;
          resolve(true);
        });
    });
  }

  _exec() {
    return Promise.resolve(this._task.details);
  }
}
routes.push(GetTask);

/**
 * @class AddTask
 */
class AddTask extends Route {
  constructor() {
    super('task', 'ADD TASK');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = Model.Task.validate(this.req.body);
      if (!validation.isValid) {
        this.log(`ERROR: Missing required fields: ${validation.missing}`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `Missing required fields: ${validation.missing}`});
        return;
      }

      resolve(true);
    });
  }

  _exec() {
    return Model.Task.add(this.req.body)
      .then(arr => arr[0])
      .then(Helpers.Promise.prop('details'));
  }
}
routes.push(AddTask);

/**
 * @class UpdateTask
 */
class UpdateTask extends Route {
  constructor() {
    super('task/:id', 'UPDATE TASK');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.WRITE;
    this._task = null;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = Model.Task.validateUpdate(this.req.body);
      if (!validation.isValid) {
        if (validation.isPathValid === false) {
          this.log(`ERROR: Update path is invalid: ${validation.invalidPath}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `APPOINTMENT: Update path is invalid: ${validation.invalidPath}`});
          return;
        }
        if (validation.isValueValid === false) {
          this.log(`ERROR: Update value is invalid: ${validation.invalidValue}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `APPOINTMENT: Update value is invalid: ${validation.invalidValue}`});
          return;
        }
      }

      Model.Task.findById(this.req.params.id)
      .then(task => {
        if (!task) {
          this.log('ERROR: Invalid Task ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        this._task = task;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._task.updateByPath(this.req.body);
  }
}
routes.push(UpdateTask);

/**
 * @class DeleteTask
 */
class DeleteTask extends Route {
  constructor() {
    super('task/:id', 'DELETE TASK');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._task = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Task.findById(this.req.params.id)
        .then(task => {
          if (!task) {
            this.log('ERROR: Invalid Task ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._task = task;
          resolve(true);
        });
    });
  }

  _exec() {
    return this._task.rm().then(() => true);
  }
}
routes.push(DeleteTask);

/**
 * @class DeleteAllTasks
 */
class DeleteAllTasks extends Route {
  constructor() {
    super('task', 'DELETE ALL TASKS');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.DELETE;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Task.rmAll().then(() => true);
  }
}
routes.push(DeleteAllTasks);

/**
 * @class AddMetadata
 */
class AddMetadata extends Route {
  constructor() {
    super('task/:id/metadata/:key', 'ADD TASK METADATA');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._task = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Task.findById(this.req.params.id).then(task => {
        if (!task) {
          this.log('ERROR: Invalid Task ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (`${task._app}` !== `${this.req.authApp._id}`) {
          this.log('ERROR: Not authorised', Route.LogLevel.ERR);
          reject({statusCode: 401});
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

        this._task = task;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._task.addOrUpdateMetadata(this.req.params.key, this.req.body.value);
  }
}
routes.push(AddMetadata);

/**
 * @class GetMetadata
 */
class GetMetadata extends Route {
  constructor() {
    super('task/:id/metadata/:key?', 'GET TASK METADATA');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.GET;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      this._metadata = null;
      this._allMetadata = null;

      Logging.log(`AppID: ${this.req.authApp._id}`, Route.LogLevel.DEBUG);
      Model.Task.findById(this.req.params.id).then(task => {
        if (!task) {
          this.log('ERROR: Invalid Task ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (`${task._app}` !== `${this.req.authApp._id}`) {
          this.log('ERROR: Not authorised', Route.LogLevel.ERR);
          reject({statusCode: 401});
          return;
        }
        // Logging.log(this._metadata.value, Route.LogLevel.INFO);
        if (this.req.params.key) {
          this._metadata = task.findMetadata(this.req.params.key);
          if (this._metadata === false) {
            this.log('WARN: Task Metadata Not Found', Route.LogLevel.ERR);
            reject({statusCode: 404});
            return;
          }
        } else {
          this._allMetadata = task.metadata.reduce((prev, curr) => {
            prev[curr.key] = JSON.parse(curr.value);
            return prev;
          }, {});
        }

        resolve(true);
      });
    });
  }

  _exec() {
    return this._metadata ? this._metadata.value : this._allMetadata;
  }
}
routes.push(GetMetadata);

/**
 * @class DeleteMetadata
 */
class DeleteMetadata extends Route {
  constructor() {
    super('task/:id/metadata/:key', 'DELETE TASK METADATA');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._task = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Task
        .findById(this.req.params.id).select('id, _app')
        .then(task => {
          if (!task) {
            this.log('ERROR: Invalid Task ID', Route.LogLevel.ERR);
            reject({statusCode: 400, message: `Invalid Task ID: ${this.req.params.id}`});
            return;
          }
          if (`${task._app}` !== `${this.req.authApp._id}`) {
            this.log('ERROR: Not authorised', Route.LogLevel.ERR);
            reject({statusCode: 401});
            return;
          }
          this._task = task;
          resolve(true);
        }, err => reject({statusCode: 400, message: err.message}));
    });
  }

  _exec() {
    return this._task.rmMetadata(this.req.params.key);
  }
}
routes.push(DeleteMetadata);

/**
 * @type {*[]}
 */
module.exports = routes;
