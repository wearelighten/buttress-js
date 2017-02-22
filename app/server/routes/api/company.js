'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file company.js
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
 * @class GetCompanyList
 */
class GetCompanyList extends Route {
  constructor() {
    super('company', 'GET COMPANY LIST');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.LIST;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Company.findAll()
      .then(Helpers.Promise.arrayProp('details'));
  }
}
routes.push(GetCompanyList);

/**
 * @class GetCompany
 */
class GetCompany extends Route {
  constructor() {
    super('company/:id', 'GET COMPANY');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.READ;

    this._company = false;
    this._groups = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Company.findById(this.req.params.id)
        .then(company => {
          if (!company) {
            this.log('ERROR: Invalid Company ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._company = company;
          resolve(true);
        });
    });
  }

  _exec() {
    return Promise.resolve(this._company.details);
  }
}
routes.push(GetCompany);

/**
 * @class BulkGetCompanies
 */
class BulkGetCompanies extends Route {
  constructor() {
    super('company/bulk/load', 'BULK GET COMPANIES');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.READ;
    this._ids = [];
  }

  _validate() {
    return new Promise((resolve, reject) => {
      this._ids = this.req.query.ids;
      if (!this._ids) {
        this.log('ERROR: No company IDs provided', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }
      this._ids = this._ids.split(',');
      if (!this._ids.length) {
        this.log('ERROR: No company IDs provided', Route.LogLevel.ERR);
        reject({statusCode: 400});
        return;
      }
      resolve(true);
    });
  }

  _exec() {
    return Model.Company.findAllById(this._ids).then(companies => companies.map(c => c.details));
  }
}
routes.push(BulkGetCompanies);

/**
 * @class AddCompany
 */
class AddCompany extends Route {
  constructor() {
    super('company', 'ADD COMPANY');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = Model.Company.validate(this.req.body);
      if (!validation.isValid) {
        this.log(`ERROR: Missing required fields: ${validation.missing}`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `Missing required fields: ${validation.missing}`});
        return;
      }

      Model.Company.isDuplicate(this.req.body)
        .then(res => {
          if (res === true) {
            this.log('ERROR: Duplicate company', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          resolve(true);
        });
    });
  }

  _exec() {
    return Model.Company.add(this.req.body)
      .then(arr => arr[0]);
  }
}
routes.push(AddCompany);

/**
 * @class AddCompanies
 */
class AddCompanies extends Route {
  constructor() {
    super('company/bulk/add', 'BULK ADD COMPANIES');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      // Logging.logDebug(JSON.stringify(this.req.body.companies));
      if (this.req.body.companies instanceof Array === false) {
        this.log(`ERROR: You need to supply an array of companies`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `Invalid data: send an array`});
        return;
      }
      if (this.req.body.companies.length <= 1) {
        this.log(`ERROR: For single companies use the other API`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `Invalid data: send more than one`});
        return;
      }
      if (this.req.body.companies.length > 301) {
        this.log(`ERROR: No more than 300`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `Invalid data: send no more than 300 companies at a time`});
        return;
      }

      let validation = Model.Company.validate(this.req.body.companies);
      if (!validation.isValid) {
        this.log(`ERROR: Missing required fields: ${validation.missing}`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `Missing required fields: ${validation.missing}`});
        return;
      }

      Model.Company.isDuplicate(this.req.body)
        .then(res => {
          if (res === true) {
            this.log('ERROR: Duplicate company', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          resolve(true);
        });
    });
  }

  _exec() {
    return Model.Company.add(this.req.body.companies)
        .then(Logging.Promise.logProp('Added Companies', 'length', Route.LogLevel.VERBOSE));
  }
}
routes.push(AddCompanies);

/**
 * @class UpdateCompany
 */
class UpdateCompany extends Route {
  constructor() {
    super('company/:id', 'UPDATE COMPANY');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.WRITE;
    this._company = null;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = Model.Company.validateUpdate(this.req.body);
      if (!validation.isValid) {
        if (validation.isPathValid === false) {
          this.log(`ERROR: Update path is invalid: ${validation.invalidPath}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `COMPANY: Update path is invalid: ${validation.invalidPath}`});
          return;
        }
        if (validation.isValueValid === false) {
          this.log(`ERROR: Update value is invalid: ${validation.invalidValue}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `COMPANY: Update value is invalid: ${validation.invalidValue}`});
          return;
        }
      }

      Model.Company.findById(this.req.params.id)
        .then(company => {
          if (!company) {
            this.log('ERROR: Invalid Company ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._company = company;
          resolve(true);
        });
    });
  }

  _exec() {
    return this._company.updateByPath(this.req.body);
  }
}
routes.push(UpdateCompany);

/**
 * @class UpdateCompany
 */
// class UpdateCompany extends Route {
//   constructor() {
//     super('company/:id', 'UPDATE COMPANY');
//     this.verb = Route.Constants.Verbs.PUT;
//     this.auth = Route.Constants.Auth.ADMIN;
//     this.permissions = Route.Constants.Permissions.WRITE;
//     this._company = null;
//   }
//
//   _validate() {
//     return new Promise((resolve, reject) => {
//       Model.Company.findById(this.req.params.id)
//       .then(company => {
//         if (!company) {
//           this.log('ERROR: Invalid Company ID', Route.LogLevel.ERR);
//           reject({statusCode: 400});
//           return;
//         }
//         this._company = company;
//         resolve(true);
//       });
//     });
//   }
//
//   _exec() {
//     return this._company.updateByObject(this.req.body)
//         .then(Helpers.Promise.prop('details'));
//   }
// }
// routes.push(UpdateCompany);

/**
 * @class DeleteCompany
 */
class DeleteCompany extends Route {
  constructor() {
    super('company/:id', 'DELETE COMPANY');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._company = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Company.findById(this.req.params.id)
        .then(company => {
          if (!company) {
            this.log('ERROR: Invalid Company ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._company = company;
          resolve(true);
        });
    });
  }

  _exec() {
    return Model.Company.rm(this._company).then(() => true);
  }
}
routes.push(DeleteCompany);

/**
 * @class BulkDeleteCompanies
 */
class BulkDeleteCompanies extends Route {
  constructor() {
    super('company/bulk/delete', 'BULK DELETE COMPANIES');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._ids = [];
  }

  _validate() {
    return new Promise((resolve, reject) => {
      this._ids = this.req.query.ids;
      if (!this._ids) {
        this.log('ERROR: No company IDs provided', Route.LogLevel.ERR);
        reject({statusCode: 400, message: 'ERROR: No company IDs provided'});
        return;
      }
      this._ids = this._ids.split(',');
      if (!this._ids.length) {
        this.log('ERROR: No company IDs provided', Route.LogLevel.ERR);
        reject({statusCode: 400, message: 'ERROR: No company IDs provided'});
        return;
      }
      if (this._ids.length > 300) {
        this.log('ERROR: No more than 300 company IDs are supported', Route.LogLevel.ERR);
        reject({statusCode: 400, message: 'ERROR: No more than 300 company IDs are supported'});
        return;
      }
      resolve(true);
    });
  }

  _exec() {
    return Model.Company.rmBulk(this._ids).then(() => true);
  }
}
routes.push(BulkDeleteCompanies);

/**
 * @class DeleteAllCompanies
 */
class DeleteAllCompanies extends Route {
  constructor() {
    super('company', 'DELETE ALL COMPANIES');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.DELETE;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Company.rmAll().then(() => true);
  }
}
routes.push(DeleteAllCompanies);

/**
 * @class AddMetadata
 */
class AddMetadata extends Route {
  constructor() {
    super('company/:id/metadata/:key', 'ADD COMPANY METADATA');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
    this._company = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Company.findById(this.req.params.id).then(company => {
        if (!company) {
          this.log('ERROR: Invalid Company ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (`${company._app}` !== `${this.req.authApp._id}`) {
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

        this._company = company;
        resolve(true);
      });
    });
  }

  _exec() {
    return this._company.addOrUpdateMetadata(this.req.params.key, this.req.body.value);
  }
}
routes.push(AddMetadata);

/**
 * @class GetMetadata
 */
class GetMetadata extends Route {
  constructor() {
    super('company/:id/metadata/:key?', 'GET COMPANY METADATA');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.GET;

    this._metadata = null;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      this._metadata = null;
      this._allMetadata = null;

      Logging.log(`AppID: ${this.req.authApp._id}`, Route.LogLevel.DEBUG);
      Model.Company.findById(this.req.params.id).then(company => {
        if (!company) {
          this.log('ERROR: Invalid Company ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        if (`${company._app}` !== `${this.req.authApp._id}`) {
          this.log('ERROR: Not authorised', Route.LogLevel.ERR);
          reject({statusCode: 401});
          return;
        }
        // Logging.log(this._metadata.value, Route.LogLevel.INFO);
        if (this.req.params.key) {
          this._metadata = company.findMetadata(this.req.params.key);
          if (this._metadata === false) {
            this.log('WARN: Company Metadata Not Found', Route.LogLevel.ERR);
            reject({statusCode: 404});
            return;
          }
        } else {
          this._allMetadata = company.metadata.reduce((prev, curr) => {
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
    super('company/:id/metadata/:key', 'DELETE COMPANY METADATA');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._company = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Company
        .findById(this.req.params.id).select('id, _app')
        .then(company => {
          if (!company) {
            this.log('ERROR: Invalid Person ID', Route.LogLevel.ERR);
            reject({statusCode: 400, message: `Invalid Person ID: ${this.req.params.id}`});
            return;
          }
          if (`${company._app}` !== `${this.req.authApp._id}`) {
            this.log('ERROR: Not authorised', Route.LogLevel.ERR);
            reject({statusCode: 401});
            return;
          }
          this._company = company;
          resolve(true);
        }, err => reject({statusCode: 400, message: err.message}));
    });
  }

  _exec() {
    return this._company.rmMetadata(this.req.params.key);
  }
}
routes.push(DeleteMetadata);

/**
 * @type {*[]}
 */
module.exports = routes;
