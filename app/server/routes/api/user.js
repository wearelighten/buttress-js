'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file user.js
 * @description USER API specification
 * @module API
 * @author Chris Bates-Keegan
 *
 */

var Route = require('../route');
var Model = require('../../model');
var Logging = require('../../logging');
var Helpers = require('../../helpers');

var routes = [];

/**
 * @class GetUserList
 */
class GetUserList extends Route {
  constructor() {
    super('user', 'GET USER LIST');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.LIST;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.User.getAll()
    .then(users => users.map(u => u.details));
  }
}
routes.push(GetUserList);

/**
 * @class GetUser
 */
class GetUser extends Route {
  constructor() {
    super('user/:id', 'GET USER');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.READ;

    this._user = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.params.id) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }
      Model.User.findById(this.req.params.id).populate('_person').then(user => {
        if (!user) {
          this.log('ERROR: Invalid User ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }

        this._user = user;
        resolve(true);
      });
    });
  }

  _exec() {
    return Promise.resolve(this._user.details);
  }
}
routes.push(GetUser);

/**
 * @class FindUser
 */
class FindUser extends Route {
  constructor() {
    super('user/:app(twitter|facebook|google)/:id', 'FIND USER');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.READ;

    this._user = false;
    this._userAuthToken = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.User.getByAppId(this.req.params.app, this.req.params.id).then(user => {
        Logging.logDebug(`FindUser: ${user !== null}`);
        this._user = user;
        if (this._user) {
          Model.Token.findUserAuthToken(this._user.id, this.req.authApp._id)
          .then(token => {
            Logging.logDebug(`FindUserToken: ${token !== null}`);
            this._userAuthToken = token ? token.value : false;
            this._user.updateApps(this.req.authApp)
              .then(resolve, reject);
          });
        } else {
          resolve(true);
        }
      });
    });
  }

  _exec() {
    return Promise.resolve(this._user ? {
      id: this._user.id,
      authToken: this._userAuthToken
    } : false);
  }
}
routes.push(FindUser);

/**
 * @class CreateUserAuthToken
 */
class CreateUserAuthToken extends Route {
  constructor() {
    super('user/:id/token', 'CREATE USER AUTH TOKEN');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.WRITE;

    this._user = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.body.auth ||
        !this.req.body.auth.authLevel ||
        !this.req.body.auth.permissions ||
        !this.req.body.auth.domains) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }
      this.req.body.auth.type = Model.Constants.Token.Type.USER;
      this.req.body.auth.app = this.req.authApp;

      Model.User.findById(this.req.params.id).select('-metadata').then(user => {
        Logging.log(`User: ${user ? user.id : null}`, Logging.Constants.LogLevel.DEBUG);
        this._user = user;
        if (this._user) {
          resolve(true);
        } else {
          this.log('ERROR: Invalid User ID', Route.LogLevel.ERR);
          resolve({statusCode: 400});
        }
      });
    });
  }

  _exec() {
    return Model.Token.add(Object.assign(this.req.body.auth, {user: this._user}))
      .then(t => Object.assign(t.details, {value: t.value}));
  }
}
routes.push(CreateUserAuthToken);

/**
 * @class UpdateUserAppToken
 */
class UpdateUserAppToken extends Route {
  constructor() {
    super('user/:id/:app(twitter|facebook|google)/token', 'UPDATE USER APP TOKEN');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.READ;

    this._user = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.body ||
        !this.req.body.token) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }

      Model.User.findById(this.req.params.id).select('-metadata').then(user => {
        Logging.log(`User: ${user ? user.id : null}`, Logging.Constants.LogLevel.DEBUG);
        this._user = user;
        if (this._user) {
          resolve(true);
        } else {
          this.log('ERROR: Invalid User ID', Route.LogLevel.ERR);
          resolve({statusCode: 400});
        }
      });
    });
  }

  _exec() {
    return this._user.updateToken(this.req.params.app, this.req.body);
  }
}
routes.push(UpdateUserAppToken);

/**
 * @class AddUser
 */
class AddUser extends Route {
  constructor() {
    super('user/:app?', 'ADD USER');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Logging.log(this.req.body.user, Logging.Constants.LogLevel.DEBUG);
      var app = this.req.body.user.app ? this.req.body.user.app : this.req.params.app;

      if (!app ||
          !this.req.body.user.id ||
          !this.req.body.user.token ||
          !this.req.body.user.profileImgUrl) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }

      if (this.req.body.auth) {
        this.log(this.req.body.auth);
        this.log('User Auth Token Reqested');
        if (!this.req.body.auth.authLevel ||
            !this.req.body.auth.permissions ||
            !this.req.body.auth.domains) {
          this.log('ERROR: Missing required field', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        this.req.body.auth.type = Model.Constants.Token.Type.USER;
        this.req.body.auth.app = this.req.authApp;
      }

      Model.Person.findByDetails(this.req.body.user)
        .then(person => {
          Logging.logDebug(`Found Person: ${person !== null}`);
          if (person === null) {
            Model.Person.add(this.req.body.user, this.req.authApp)
            .then(p => {
              Logging.log(p, Logging.Constants.LogLevel.SILLY);
              this._person = p;
              resolve(true);
            });
          } else {
            this._person = person.details;
            resolve(true);
          }
        }, reject);
    });
  }

  _exec() {
    return Model.User
    .add(this.req.body.user, this._person, this.req.body.auth)
    .then(res => Object.assign(res[0], {authToken: res[1] ? res[1].value : false}));
  }
}
routes.push(AddUser);

/**
 * @class DeleteAllUsers
 */
class DeleteAllUsers extends Route {
  constructor() {
    super('user', 'DELETE ALL USERS');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.DELETE;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.User.rmAll().then(() => true);
  }
}
routes.push(DeleteAllUsers);

/**
 * @class DeleteUser
 */
class DeleteUser extends Route {
  constructor() {
    super('user/:id', 'DELETE USER');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._user = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.params.id) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }
      Model.User.findById(this.req.params.id).select('-metadata').then(user => {
        if (!user) {
          this.log('ERROR: Invalid User ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        this._user = user;
        resolve(true);
      });
    });
  }

  _exec() {
    return Model.User.rm(this._user).then(() => true);
  }
}
routes.push(DeleteUser);

class AttachToPerson extends Route {
  constructor() {
    super('user/:id/person', 'ATTACH USER TO PERSON');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._user = false;
    this._person = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.User
        .findById(this.req.params.id).select('-metadata').then(user => {
          if (!user) {
            this.log('ERROR: Invalid User ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._user = user;

          if (this._user._person) {
            this.log('ERROR: Already attached to a person', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }

          if (!this.req.body.name || !this.req.body.email) {
            this.log('ERROR: Missing required field', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }

          Model.Person
            .findByDetails(this.req.body)
            .then(person => {
              this._person = person;
              if (person) {
                return Model.User.findOne({_person: person});
              }
              return Promise.resolve(null);
            })
            .then(user => {
              if (user && user._id !== this._user._id) {
                this.log('ERROR: Person attached to a different user', Route.LogLevel.ERR);
                reject({statusCode: 400});
                return;
              }
              resolve(true);
            })
            .catch(err => {
              this.log(`ERROR: ${err.message}`, Route.LogLevel.ERR);
              reject({statusCode: 400});
            });
        })
        .catch(Logging.Promise.logError());
    });
  }

  _exec() {
    return this._user.attachToPerson(this._person, this.req.body)
      .then(Helpers.Promise.prop('details'));
  }
}
routes.push(AttachToPerson);

/**
 * @class AddUserMetadata
 */
class AddUserMetadata extends Route {
  constructor() {
    super('user/:id/metadata/:key', 'ADD USER METADATA');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._user = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.User.findById(this.req.params.id).then(user => {
        if (!user) {
          this.log('ERROR: Invalid User ID', Route.LogLevel.ERR);
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

        this._user = user;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._user.addOrUpdateMetadata(this.req.params.key, this.req.body.value);
  }
}
routes.push(AddUserMetadata);

/**
 * @class UpdateUserMetadata
 */
class UpdateUserMetadata extends Route {
  constructor() {
    super('user/:id/metadata/:key', 'UPDATE USER METADATA');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._app = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.User.findById(this.req.params.id).then(user => {
        if (!user) {
          this.log('ERROR: Invalid App ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (user.findMetadata(this.req.params.key) === false) {
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

        this._user = user;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._user.addOrUpdateMetadata(this.req.params.key, this.req.body.value);
  }
}
routes.push(UpdateUserMetadata);

/**
 * @class GetMetadata
 */
class GetMetadata extends Route {
  constructor() {
    super('user/:id/metadata/:key?', 'GET USER METADATA');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.GET;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      this._metadata = null;
      this._allMetadata = null;

      Logging.log(`AppID: ${this.req.authApp._id}`, Route.LogLevel.DEBUG);
      Model.User.findById(this.req.params.id).then(user => {
        if (!user) {
          this.log('ERROR: Invalid User ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        let appIndex = user._apps.findIndex(a => `${a}` === `${this.req.authApp._id}`);
        if (appIndex === -1) {
          this.log('ERROR: Not authorised', Route.LogLevel.ERR);
          reject({statusCode: 401, message: `App:${this.req.authApp._id} is not authorised for this user.`});
          return;
        }
        // Logging.log(this._metadata.value, Route.LogLevel.INFO);
        if (this.req.params.key) {
          this._metadata = user.findMetadata(this.req.params.key);
          if (this._metadata === false) {
            this.log('WARN: User Metadata Not Found', Route.LogLevel.ERR);
            reject({statusCode: 404});
            return;
          }
        } else {
          this._allMetadata = user.metadata.reduce((prev, curr) => {
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
 * @type {*[]}
 */
module.exports = routes;
