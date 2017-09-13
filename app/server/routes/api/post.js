'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file post.js
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
 * @class GetPostList
 */
class GetPostList extends Route {
  constructor() {
    super('post', 'GET POST LIST');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.LIST;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Post.getAll();
  }
}
routes.push(GetPostList);

/**
 * @class GetAllMetadata
 */
class GetAllMetadata extends Route {
  constructor() {
    super('post/metadata/all', 'GET ALL POST METADATA');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.GET;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Post.getAllMetadata();
  }
}
routes.push(GetAllMetadata);

/**
 * @class GetPost
 */
class GetPost extends Route {
  constructor() {
    super('post/:id', 'GET POST');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.READ;

    this._post = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Post.findById(this.req.params.id)
        .then(post => {
          if (!post) {
            this.log('ERROR: Invalid Post ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._post = post;
          resolve(true);
        });
    });
  }

  _exec() {
    return Promise.resolve(this._post.details);
  }
}
routes.push(GetPost);

/**
 * @class AddPost
 */
class AddPost extends Route {
  constructor() {
    super('post', 'ADD POST');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this.activityVisibility = Model.Constants.Activity.Visibility.PUBLIC;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = Model.Post.validate(this.req.body);
      if (!validation.isValid) {
        if (validation.missing.length > 0) {
          this.log(`ERROR: Missing field: ${validation.missing[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `POST: Missing field: ${validation.missing[0]}`});
          return;
        }
        if (validation.invalid.length > 0) {
          this.log(`ERROR: Invalid value: ${validation.invalid[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `POST: Invalid value: ${validation.invalid[0]}`});
          return;
        }

        this.log(`ERROR: POST: Unhandled Error`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `POST: Unhandled error.`});
        return;
      }

      resolve(true);
    });
  }

  _exec() {
    return Model.Post.add(this.req.body);
  }
}
routes.push(AddPost);

/**
 * @class UpdatePost
 */
class UpdatePost extends Route {
  constructor() {
    super('post/:id', 'UPDATE POST');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.WRITE;
    this._post = null;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = Model.Post.validateUpdate(this.req.body);
      if (!validation.isValid) {
        if (validation.isPathValid === false) {
          this.log(`ERROR: Update path is invalid: ${validation.invalidPath}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `POST: Update path is invalid: ${validation.invalidPath}`});
          return;
        }
        if (validation.isValueValid === false) {
          this.log(`ERROR: Update value is invalid: ${validation.invalidValue}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `POST: Update value is invalid: ${validation.invalidValue}`});
          return;
        }
      }

      Model.Post.findById(this.req.params.id)
      .then(post => {
        if (!post) {
          this.log('ERROR: Invalid Post ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        this._post = post;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._post.updateByPath(this.req.body);
  }
}
routes.push(UpdatePost);

/**
 * @class DeletePost
 */
class DeletePost extends Route {
  constructor() {
    super('post/:id', 'DELETE POST');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._post = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Post.findById(this.req.params.id)
        .then(post => {
          if (!post) {
            this.log('ERROR: Invalid Post ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._post = post;
          resolve(true);
        });
    });
  }

  _exec() {
    return this._post.rm().then(() => true);
  }
}
routes.push(DeletePost);

/**
 * @class DeleteAllPosts
 */
class DeleteAllPosts extends Route {
  constructor() {
    super('post', 'DELETE ALL POSTS');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.DELETE;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Post.rmAll().then(() => true);
  }
}
routes.push(DeleteAllPosts);

/**
 * @class AddMetadata
 */
class AddMetadata extends Route {
  constructor() {
    super('post/:id/metadata/:key', 'ADD POST METADATA');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._post = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Post.findById(this.req.params.id).then(post => {
        if (!post) {
          this.log('ERROR: Invalid Post ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (`${post._app}` !== `${this.req.authApp._id}`) {
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

        this._post = post;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._post.addOrUpdateMetadata(this.req.params.key, this.req.body.value);
  }
}
routes.push(AddMetadata);

/**
 * @class GetMetadata
 */
class GetMetadata extends Route {
  constructor() {
    super('post/:id/metadata/:key?', 'GET POST METADATA');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.GET;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      this._metadata = null;
      this._allMetadata = null;

      Logging.log(`AppID: ${this.req.authApp._id}`, Route.LogLevel.DEBUG);
      Model.Post.findById(this.req.params.id).then(post => {
        if (!post) {
          this.log('ERROR: Invalid Post ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (`${post._app}` !== `${this.req.authApp._id}`) {
          this.log('ERROR: Not authorised', Route.LogLevel.ERR);
          reject({statusCode: 401});
          return;
        }
        // Logging.log(this._metadata.value, Route.LogLevel.INFO);
        if (this.req.params.key) {
          this._metadata = post.findMetadata(this.req.params.key);
          if (this._metadata === false) {
            this.log('WARN: Post Metadata Not Found', Route.LogLevel.ERR);
            reject({statusCode: 404});
            return;
          }
        } else {
          this._allMetadata = post.metadata.reduce((prev, curr) => {
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
    super('post/:id/metadata/:key', 'DELETE POST METADATA');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._post = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Post
        .findById(this.req.params.id).select('id, _app')
        .then(post => {
          if (!post) {
            this.log('ERROR: Invalid Post ID', Route.LogLevel.ERR);
            reject({statusCode: 400, message: `Invalid Post ID: ${this.req.params.id}`});
            return;
          }
          if (`${post._app}` !== `${this.req.authApp._id}`) {
            this.log('ERROR: Not authorised', Route.LogLevel.ERR);
            reject({statusCode: 401});
            return;
          }
          this._post = post;
          resolve(true);
        }, err => reject({statusCode: 400, message: err.message}));
    });
  }

  _exec() {
    return this._post.rmMetadata(this.req.params.key);
  }
}
routes.push(DeleteMetadata);

/**
 * @type {*[]}
 */
module.exports = routes;
