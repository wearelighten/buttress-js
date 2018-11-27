'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file report.js
 * @description Company API specification
 * @module API
 * @author Chris Bates-Keegan
 *
 */

const Route = require('../route');
const Model = require('../../model');
// const Logging = require('../../logging');

let routes = [];

/**
 * @class GetReportList
 */
class GetReportList extends Route {
  constructor() {
    super('report', 'GET REPORT LIST');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.LIST;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Report.getAll();
  }
}
routes.push(GetReportList);

/**
 * @class GetReport
 */
class GetReport extends Route {
  constructor() {
    super('report/:id', 'GET REPORT');
    this.verb = Route.Constants.Verbs.GET;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.READ;

    this._report = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Report.findById(this.req.params.id)
        .then(report => {
          if (!report) {
            this.log('ERROR: Invalid Report ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._report = report;
          resolve(true);
        });
    });
  }

  _exec() {
    return Promise.resolve(this._report);
  }
}
routes.push(GetReport);

/**
 * @class AddReport
 */
class AddReport extends Route {
  constructor() {
    super('report', 'ADD REPORT');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = Model.Report.validate(this.req.body);
      if (!validation.isValid) {
        if (validation.missing.length > 0) {
          this.log(`ERROR: Missing field: ${validation.missing[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `REPORT: Missing field: ${validation.missing[0]}`});
          return;
        }
        if (validation.invalid.length > 0) {
          this.log(`ERROR: Invalid value: ${validation.invalid[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `REPORT: Invalid value: ${validation.invalid[0]}`});
          return;
        }

        this.log(`ERROR: REPORT: Unhandled Error`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `REPORT: Unhandled error.`});
        return;
      }

      resolve(true);
    });
  }

  _exec() {
    return Model.Report.add(this.req.body);
  }
}
routes.push(AddReport);

/**
 * @class BulkAddReports
 */
class BulkAddReports extends Route {
  constructor() {
    super('report/bulk/add', 'BULK ADD REPORTS');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.ADD;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      // Logging.logDebug(JSON.stringify(this.req.body.reports));
      if (this.req.body.reports instanceof Array === false) {
        this.log(`ERROR: You need to supply an array of reports`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `Invalid data: send an array of reports`});
        return;
      }
      // if (this.req.body.reports.length > 301) {
      //   this.log(`ERROR: No more than 300 reports`, Route.LogLevel.ERR);
      //   reject({statusCode: 400, message: `Invalid data: send no more than 300 reports at a time`});
      //   return;
      // }

      let validation = Model.Report.validate(this.req.body.reports);
      if (!validation.isValid) {
        if (validation.missing.length > 0) {
          this.log(`ERROR: Missing field: ${validation.missing[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `REPORT: Missing field: ${validation.missing[0]}`});
          return;
        }
        if (validation.invalid.length > 0) {
          this.log(`ERROR: Invalid value: ${validation.invalid[0]}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `REPORT: Invalid value: ${validation.invalid[0]}`});
          return;
        }

        this.log(`ERROR: REPORT: Unhandled Error`, Route.LogLevel.ERR);
        reject({statusCode: 400, message: `REPORT: Unhandled error.`});
        return;
      }

      resolve(true);
    });
  }

  _exec() {
    return Model.Report.add(this.req.body.reports);
  }
}
routes.push(BulkAddReports);

/**
 * @class UpdateReport
 */
class UpdateReport extends Route {
  constructor() {
    super('report/:id', 'UPDATE REPORT');
    this.verb = Route.Constants.Verbs.PUT;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.WRITE;
    this._report = null;

    this.activityVisibility = Model.Constants.Activity.Visibility.PRIVATE;
    this.activityBroadcast = true;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      let validation = Model.Report.validateUpdate(this.req.body);
      if (!validation.isValid) {
        if (validation.isPathValid === false) {
          this.log(`ERROR: Update path is invalid: ${validation.invalidPath}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `REPORT: Update path is invalid: ${validation.invalidPath}`});
          return;
        }
        if (validation.isValueValid === false) {
          this.log(`ERROR: Update value is invalid: ${validation.invalidValue}`, Route.LogLevel.ERR);
          reject({statusCode: 400, message: `REPORT: Update value is invalid: ${validation.invalidValue}`});
          return;
        }
      }

      Model.Report.exists(this.req.params.id)
      .then(exists => {
        if (!exists) {
          this.log('ERROR: Invalid Report ID', Route.LogLevel.ERR);
          reject({statusCode: 400});
          return;
        }
        resolve(true);
      });
    });
  }

  _exec() {
    return Model.Report.updateByPath(this.req.body, this.req.params.id);
  }
}
routes.push(UpdateReport);

/**
 * @class DeleteReport
 */
class DeleteReport extends Route {
  constructor() {
    super('report/:id', 'DELETE REPORT');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._report = false;
  }

  _validate() {
    return new Promise((resolve, reject) => {
      Model.Report.findById(this.req.params.id)
        .then(report => {
          if (!report) {
            this.log('ERROR: Invalid Report ID', Route.LogLevel.ERR);
            reject({statusCode: 400});
            return;
          }
          this._report = report;
          resolve(true);
        });
    });
  }

  _exec() {
    return this._report.rm().then(() => true);
  }
}
routes.push(DeleteReport);

/**
 * @class BulkDeleteReports
 */
class BulkDeleteReports extends Route {
  constructor() {
    super('report/bulk/delete', 'BULK DELETE REPORTS');
    this.verb = Route.Constants.Verbs.POST;
    this.auth = Route.Constants.Auth.ADMIN;
    this.permissions = Route.Constants.Permissions.DELETE;
    this._ids = [];
  }

  _validate() {
    return new Promise((resolve, reject) => {
      this._ids = this.req.body;
      if (!this._ids) {
        this.log('ERROR: No report IDs provided', Route.LogLevel.ERR);
        reject({statusCode: 400, message: 'ERROR: No report IDs provided'});
        return;
      }
      if (!this._ids.length) {
        this.log('ERROR: No report IDs provided', Route.LogLevel.ERR);
        reject({statusCode: 400, message: 'ERROR: No report IDs provided'});
        return;
      }
      // if (this._ids.length > 300) {
      //   this.log('ERROR: No more than 300 report IDs are supported', Route.LogLevel.ERR);
      //   reject({statusCode: 400, message: 'ERROR: No more than 300 report IDs are supported'});
      //   return;
      // }
      resolve(true);
    });
  }

  _exec() {
    return Model.Report.rmBulk(this._ids).then(() => true);
  }
}
routes.push(BulkDeleteReports);

/**
 * @class DeleteAllReports
 */
class DeleteAllReports extends Route {
  constructor() {
    super('report', 'DELETE ALL REPORTS');
    this.verb = Route.Constants.Verbs.DEL;
    this.auth = Route.Constants.Auth.SUPER;
    this.permissions = Route.Constants.Permissions.DELETE;
  }

  _validate() {
    return Promise.resolve(true);
  }

  _exec() {
    return Model.Report.rmAll().then(() => true);
  }
}
routes.push(DeleteAllReports);

/**
 * @type {*[]}
 */
module.exports = routes;
