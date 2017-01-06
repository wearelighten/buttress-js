'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file contactlist.js
 * @description Contact List API specification
 * @module API
 * @author Chris Bates-Keegan
 *
 */

var Route = require('../route');
var Model = require('../../model');

var routes = [];

/**
 * @class GetContactListList
 */
class GetContactListList extends Route {
  constructor() {
    super('contact-list', 'GET CONTACT LIST LIST');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.LIST;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Contactlist.getAll();
  }
}
routes.push(GetContactListList);

/**
 * @class GetContactList
 */
class GetContactList extends Route {
  constructor() {
    super('contact-list/:id', 'GET CONTACT LIST');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.READ;

    this._contactList = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.params.id) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }
      Model.Contactlist.findById(this.req.params.id)
        .select('-metadata')
        .then(contactList => {
          if (!contactList) {
            this.log('ERROR: Invalid ContactList ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }

          this._contactList = contactList;
          // this.log(this._contactList.details);
          resolve(true);
      });
    });
  }

  _exec() {
    return Promise.resolve(this._contactList.details);
  }
}
routes.push(GetContactList);

/**
 * @class DeleteAllContactLists
 */
class DeleteAllContactLists extends Route {
  constructor() {
    super('contact-list', 'DELETE ALL CONTACT LISTS');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.DELETE;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Contactlist.rmAll().then(() => true);
  }
}
routes.push(DeleteAllContactLists);

/**
 * @class DeleteContactList
 */
class DeleteContactList extends Route {
  constructor() {
    super('contact-list/:id', 'DELETE CONTACT LIST');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._contactList = false;

    this.activityTitle = '';
    this.activityDescription = 'A Contact List was deleted by %USER_NAME%';
    this.activityVisibility = Model.Constants.Activity.Visibility.PUBLIC;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.params.id) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }
      Model.ContactList.findById(this.req.params.id).select('-metadata').then(contactList => {
        if (!contactList) {
          this.log('ERROR: Invalid ContactList ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        this._contactList = contactList;
        this.activityTitle = contactList.name;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._contactList.rm().then(() => true);
  }
}
routes.push(DeleteContactList);

/**
 * @class AddContactListMetadata
 */
class AddContactListMetadata extends Route {
  constructor() {
    super('contact-list/:id/metadata/:key', 'ADD CONTACT LIST METADATA');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._contactList = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.ContactList.findById(this.req.params.id).then(contactList => {
        if (!contactList) {
          this.log('ERROR: Invalid ContactList ID', Route.LogLevel.ERR);
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

        this._contactList = contactList;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._contactList.addOrUpdateMetadata(this.req.params.key, this.req.body.value);
  }
}
routes.push(AddContactListMetadata);

/**
 * @class UpdateContactListMetadata
 */
class UpdateContactListMetadata extends Route {
  constructor() {
    super('contact-list/:id/metadata/:key', 'UPDATE CONTACT LIST METADATA');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._app = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.ContactList.findById(this.req.params.id).then(contactList => {
        if (!contactList) {
          this.log('ERROR: Invalid App ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (contactList.findMetadata(this.req.params.key) === false) {
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

        this._contactList = contactList;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._contactList.addOrUpdateMetadata(this.req.params.key, this.req.body.value);
  }
}
routes.push(UpdateContactListMetadata);

/**
 * @class GetContactListMetadata
 */
class GetContactListMetadata extends Route {
  constructor() {
    super('contact-list/:id/metadata/:key', 'GET CONTACT LIST METADATA');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.GET;

    this._metadata = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.ContactList.findById(this.req.params.id).then(contactList => {
        if (!contactList) {
          this.log('ERROR: Invalid ContactList ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }

        this._metadata = contactList.findMetadata(this.req.params.key);
        if (this._metadata === false) {
          this.log('WARN: App Metadata Not Found', Route.LogLevel.ERR);
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
routes.push(GetContactListMetadata);

/**
 * @class DeleteContactListMetadata
 */
class DeleteContactListMetadata extends Route {
  constructor() {
    super('contact-list/:id/metadata/:key', 'DELETE CONTACT LIST METADATA');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._contactList = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.ContactList
        .findById(this.req.params.id).select('id')
        .then(contactList => {
          if (!contactList) {
            this.log('ERROR: Invalid ContactList ID', Route.LogLevel.ERR);
            reject({statusCode: 400, message: `Invalid ContactList ID: ${this.req.params.id}`});
            return;
          }
          this._contactList = contactList;
          resolve(true);
        }, err => reject({statusCode: 400, message: err.message}));
    });
  }

  _exec() {
    return this._contactList.rmMetadata(this.req.params.key);
  }
}
routes.push(DeleteContactListMetadata);

/**
 * @type {*[]}
 */
module.exports = routes;
