'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file campaign.js
 * @description Campaign API specification
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
 * @class GetCampaignList
 */
class GetCampaignList extends Route {
  constructor() {
    super('campaign', 'GET CAMPAIGN LIST');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.LIST;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Campaign.getAll();
  }
}
routes.push(GetCampaignList);

/**
 * @class GetCampaign
 */
class GetCampaign extends Route {
  constructor() {
    super('campaign/:id', 'GET CAMPAIGN');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.READ;

    this._campaign = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.params.id) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }
      Model.Campaign.findById(this.req.params.id).then(campaign => {
        if (!campaign) {
          this.log('ERROR: Invalid Campaign ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }

        this._campaign = campaign;
        resolve(true);
      });
    });
  }

  _exec() {
    return Promise.resolve(this._campaign.details);
  }
}
routes.push(GetCampaign);

/**
 * @class FindCampaign
 */
class FindCampaign extends Route {
  constructor() {
    super('campaign/:name', 'FIND CAMPAIGN');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.READ;

    this._campaign = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Campaign.getByName(this.req.params.name).then(campaign => {
        Logging.log(`Campaign: ${campaign}`, Logging.Constants.LogLevel.DEBUG);
        this._campaign = campaign;
        resolve(true);
      });
    });
  }

  _exec() {
    return Promise.resolve(this._campaign ? this._campaign.details : false);
  }
}
routes.push(FindCampaign);

/**
 * @class AddCampaign
 */
class AddCampaign extends Route {
  constructor() {
    super('campaign', 'ADD CAMPAIGN');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Logging.log(this.req.body, Logging.Constants.LogLevel.DEBUG);

      if (!this.req.body.name || !this.req.body.description || !this.req.body.legals) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }

      resolve(true);
    });
  }

  _exec() {
    return new Promise((resolve, reject) => {
      Model.Campaign.add(this.req.body)
        .then(Logging.Promise.logProp('Added Campaign', 'name', Route.LogLevel.VERBOSE))
        .then(Helpers.Promise.prop('details', Route.LogLevel.DEBUG))
        .then(resolve, reject);
    });
  }
}
routes.push(AddCampaign);

/**
 * @class DeleteCampaign
 */
class DeleteCampaign extends Route {
  constructor() {
    super('campaign/:id', 'DELETE CAMPAIGN');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._campaign = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      if (!this.req.params.id) {
        this.log('ERROR: Missing required field', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }
      Model.Campaign.findById(this.req.params.id).select('-metadata').then(campaign => {
        if (!campaign) {
          this.log('ERROR: Invalid Campaign ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        this._campaign = campaign;
        resolve(true);
      });
    });
  }

  _exec() {
    return Model.Campaign.rm(this._campaign).then(() => true);
  }
}
routes.push(DeleteCampaign);

/**
 * @class AddCampaignImage
 */
class AddCampaignImage extends Route {
  constructor() {
    super('campaign/:id/image', 'ADD CAMPAIGN IMAGE');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._campaign = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Campaign.findById(this.req.params.id).then(campaign => {
        if (!campaign) {
          this.log('ERROR: Invalid Campaign ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }

        if (!this.req.body.label || !this.req.body.image) {
          this.log('ERROR: Missing required field', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }

        this._campaign = campaign;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._campaign.addImage(this.req.body.label, this.req.body.image);
  }
}
routes.push(AddCampaignImage);

/**
 * @class AddCampaignMetadata
 */
class AddCampaignMetadata extends Route {
  constructor() {
    super('campaign/:id/metadata/:key', 'ADD CAMPAIGN METADATA');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._campaign = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Campaign.findById(this.req.params.id).then(campaign => {
        if (!campaign) {
          this.log('ERROR: Invalid Campaign ID', Route.LogLevel.ERR);
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

        this._campaign = campaign;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._campaign.addOrUpdateMetadata(this.req.params.key, this.req.body.value);
  }
}
routes.push(AddCampaignMetadata);

/**
 * @class UpdateCampaignMetadata
 */
class UpdateCampaignMetadata extends Route {
  constructor() {
    super('campaign/:id/metadata/:key', 'UPDATE CAMPAIGN METADATA');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this._app = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Campaign.findById(this.req.params.id).then(campaign => {
        if (!campaign) {
          this.log('ERROR: Invalid App ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (campaign.findMetadata(this.req.params.key) === false) {
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

        this._campaign = campaign;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._campaign.addOrUpdateMetadata(this.req.params.key, this.req.body.value);
  }
}
routes.push(UpdateCampaignMetadata);

/**
 * @class GetCampaignMetadata
 */
class GetCampaignMetadata extends Route {
  constructor() {
    super('campaign/:id/metadata/:key', 'GET CAMPAIGN METADATA');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.GET;

    this._metadata = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Campaign.findById(this.req.params.id).then(campaign => {
        if (!campaign) {
          this.log('ERROR: Invalid Campaign ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }

        this._metadata = campaign.findMetadata(this.req.params.key);
        if (this._metadata === undefined) {
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
routes.push(GetCampaignMetadata);

/**
 * @type {*[]}
 */
module.exports = routes;
