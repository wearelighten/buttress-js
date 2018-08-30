'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file location.js
 * @description Company API specification
 * @module API
 * @author Chris Bates-Keegan
 *
 */

const Route = require('../route');
const Model = require('../../model');
const Logging = require('../../logging');

let routes = [];

/**
 * @class GetLocationList
 */
class GetLocationList extends Route {
  constructor() {
    super('location', 'GET LOCATION LIST');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.LIST;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Location.getAll();
  }
}
routes.push(GetLocationList);

/**
 * @class GetAllMetadata
 */
class GetAllMetadata extends Route {
  constructor() {
    super('location/metadata/all', 'GET ALL LOCATION METADATA');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.GET;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Location.getAllMetadata();
  }
}
routes.push(GetAllMetadata);

/**
 * @class GetLocation
 */
class GetLocation extends Route {
  constructor() {
    super('location/:id', 'GET LOCATION');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.READ;

    this._location = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Location.findById(this.req.params.id)
        .then(location => {
          if (!location) {
            this.log('ERROR: Invalid Location ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._location = location;
          resolve(true);
        });
    });
  }

  _exec() {
    return Promise.resolve(this._location);
  }
}
routes.push(GetLocation);

/**
 * @class AddLocation
 */
class AddLocation extends Route {
  constructor() {
    super('location', 'ADD LOCATION');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = Model.Location.validate(this.req.body);
      if (!validation.isValid) {
        if (validation.missing.length > 0) {
          this.log(`ERROR: Missing field: ${validation.missing[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `LOCATION: Missing field: ${validation.missing[0]}`});
          return;
        }
        if (validation.invalid.length > 0) {
          this.log(`ERROR: Invalid value: ${validation.invalid[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `LOCATION: Invalid value: ${validation.invalid[0]}`});
          return;
        }

        this.log(`ERROR: LOCATION: Unhandled Error`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `LOCATION: Unhandled error.`});
        return;
      }

      resolve(true);
    });
  }

  _exec() {
    return Model.Location.add(this.req.body);
  }
}
routes.push(AddLocation);

/**
 * @class BulkAddLocations
 */
class BulkAddLocations extends Route {
  constructor() {
    super('location/bulk/add', 'BULK ADD LOCATIONS');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      // Logging.logDebug(JSON.stringify(this.req.body.locations));
      if (this.req.body.locations instanceof Array === false) {
        this.log(`ERROR: You need to supply an array of locations`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `Invalid data: send an array of locations`});
        return;
      }
      // if (this.req.body.locations.length > 301) {
      //   this.log(`ERROR: No more than 300 locations`, Route.LogLevel.ERR);
      //   reject({statusCode: 400, message: `Invalid data: send no more than 300 locations at a time`});
      //   return;
      // }

      let validation = Model.Location.validate(this.req.body.locations);
      if (!validation.isValid) {
        if (validation.missing.length > 0) {
          this.log(`ERROR: Missing field: ${validation.missing[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `LOCATION: Missing field: ${validation.missing[0]}`});
          return;
        }
        if (validation.invalid.length > 0) {
          this.log(`ERROR: Invalid value: ${validation.invalid[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `LOCATION: Invalid value: ${validation.invalid[0]}`});
          return;
        }

        this.log(`ERROR: LOCATION: Unhandled Error`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `LOCATION: Unhandled error.`});
        return;
      }

      resolve(true);
    });
  }

  _exec() {
    return Model.Location.add(this.req.body.locations);
  }
}
routes.push(BulkAddLocations);

/**
 * @class UpdateLocation
 */
class UpdateLocation extends Route {
  constructor() {
    super('location/:id', 'UPDATE LOCATION');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.WRITE;
    this._location = null;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = Model.Location.validateUpdate(this.req.body);
      if (!validation.isValid) {
        if (validation.isPathValid === false) {
          this.log(`ERROR: Update path is invalid: ${validation.invalidPath}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `LOCATION: Update path is invalid: ${validation.invalidPath}`});
          return;
        }
        if (validation.isValueValid === false) {
          this.log(`ERROR: Update value is invalid: ${validation.invalidValue}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `LOCATION: Update value is invalid: ${validation.invalidValue}`});
          return;
        }
      }

      Model.Location.exists(this.req.params.id)
      .then(exists => {
        if (!exists) {
          this.log('ERROR: Invalid Location ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        resolve(true);
      });
    });
  }

  _exec() {
    return Model.Location.updateByPath(this.req.body, this.req.params.id);
  }
}
routes.push(UpdateLocation);

/**
 * @class DeleteLocation
 */
class DeleteLocation extends Route {
  constructor() {
    super('location/:id', 'DELETE LOCATION');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._location = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Location.findById(this.req.params.id)
        .then(location => {
          if (!location) {
            this.log('ERROR: Invalid Location ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._location = location;
          resolve(true);
        });
    });
  }

  _exec() {
    return this._location.rm().then(() => true);
  }
}
routes.push(DeleteLocation);

/**
 * @class BulkDeleteLocations
 */
class BulkDeleteLocations extends Route {
  constructor() {
    super('location/bulk/delete', 'BULK DELETE LOCATIONS');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._ids = [];
  }

  _validate() {
    return new Promise((resolve, reject) => {
      this._ids = this.req.body;
      if (!this._ids) {
        this.log('ERROR: No location IDs provided', Route.LogLevel.ERR);
        reject({statusCode: 400, message: 'ERROR: No location IDs provided'});
        return;
      }
      if (!this._ids.length) {
        this.log('ERROR: No location IDs provided', Route.LogLevel.ERR);
        reject({statusCode: 400, message: 'ERROR: No location IDs provided'});
        return;
      }
      // if (this._ids.length > 300) {
      //   this.log('ERROR: No more than 300 location IDs are supported', Route.LogLevel.ERR);
      //   reject({statusCode: 400, message: 'ERROR: No more than 300 location IDs are supported'});
      //   return;
      // }
      resolve(true);
    });
  }

  _exec() {
    return Model.Location.rmBulk(this._ids).then(() => true);
  }
}
routes.push(BulkDeleteLocations);

/**
 * @class DeleteAllLocations
 */
class DeleteAllLocations extends Route {
  constructor() {
    super('location', 'DELETE ALL LOCATIONS');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.DELETE;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Location.rmAll().then(() => true);
  }
}
routes.push(DeleteAllLocations);

/**
 * @class AddMetadata
 */
class AddMetadata extends Route {
  constructor() {
    super('location/:id/metadata/:key', 'ADD LOCATION METADATA');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
    this._location = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Location.findById(this.req.params.id).then(location => {
        if (!location) {
          this.log('ERROR: Invalid Location ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (`${location._app}` !== `${this.req.authApp._id}`) {
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

        this._location = location;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._location.addOrUpdateMetadata(this.req.params.key, this.req.body.value);
  }
}
routes.push(AddMetadata);

/**
 * @class GetMetadata
 */
class GetMetadata extends Route {
  constructor() {
    super('location/:id/metadata/:key?', 'GET LOCATION METADATA');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.GET;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      this._metadata = null;
      this._allMetadata = null;

      Logging.log(`AppID: ${this.req.authApp._id}`, Route.LogLevel.DEBUG);
      Model.Location.findById(this.req.params.id).then(location => {
        if (!location) {
          this.log('ERROR: Invalid Location ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (`${location._app}` !== `${this.req.authApp._id}`) {
          this.log('ERROR: Not authorised', Route.LogLevel.ERR);
          reject({statusCode: 401});
          return;
        }
        // Logging.log(this._metadata.value, Route.LogLevel.INFO);
        if (this.req.params.key) {
          this._metadata = location.findMetadata(this.req.params.key);
          if (this._metadata === false) {
            this.log('WARN: Location Metadata Not Found', Route.LogLevel.ERR);
            reject({statusCode: 404});
            return;
          }
        } else {
          this._allMetadata = location.metadata.reduce((prev, curr) => {
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
    super('location/:id/metadata/:key', 'DELETE LOCATION METADATA');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
    this._location = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Location
        .findById(this.req.params.id).select('id, _app')
        .then(location => {
          if (!location) {
            this.log('ERROR: Invalid Location ID', Route.LogLevel.ERR);
            reject({statusCode: 400, message: `Invalid Location ID: ${this.req.params.id}`});
            return;
          }
          if (`${location._app}` !== `${this.req.authApp._id}`) {
            this.log('ERROR: Not authorised', Route.LogLevel.ERR);
            reject({statusCode: 401});
            return;
          }
          this._location = location;
          resolve(true);
        }, err => reject({statusCode: 400, message: err.message}));
    });
  }

  _exec() {
    return this._location.rmMetadata(this.req.params.key);
  }
}
routes.push(DeleteMetadata);

/**
 * @type {*[]}
 */
module.exports = routes;
