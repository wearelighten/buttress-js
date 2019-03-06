'use strict';

/**
 * ButtressJS - Realtime datastore for business software
 *
 * @file person.js
 * @description Person API specification
 * @module API
 * @author Chris Bates-Keegan
 *
 */

const Route = require('../route');
const Model = require('../../model');
const Logging = require('../../logging');

const routes = [];

/**
 * @class GetPersonList
 */
class GetPersonList extends Route {
	constructor() {
		super('person', 'GET PERSON LIST');
		this.verb = Route.Constants.Verbs.GET;
		this.auth = Route.Constants.Auth.USER;
		this.permissions = Route.Constants.Permissions.LIST;
	}

	_validate(req, res, token) {
		return new Promise((resolve, reject) => {
			resolve(true);
		});
	}

	_exec(req, res, validate) {
		return new Promise((resolve, reject) => {
			Model.Person.findAll().then(resolve, reject);
		});
	}
}
routes.push(GetPersonList);

/**
 * @class GetPerson
 */
class GetPerson extends Route {
	constructor() {
		super('person/:id', 'GET PERSON');
		this.verb = Route.Constants.Verbs.GET;
		this.auth = Route.Constants.Auth.ADMIN;
		this.permissions = Route.Constants.Permissions.READ;
	}

	_validate(req, res, token) {
		return new Promise((resolve, reject) => {
			if (!req.params.id) {
				this.log('ERROR: Missing required field', Route.LogLevel.ERR);
				reject({statusCode: 400});
				return;
			}
			Model.Person.findById(req.params.id).then((person) => {
				if (!person) {
					this.log('ERROR: Invalid Person ID', Route.LogLevel.ERR);
					reject({statusCode: 400});
					return;
				}
				resolve(person);
			});
		});
	}

	_exec(req, res, person) {
		return new Promise((resolve, reject) => {
			resolve(person.details);
		});
	}
}
routes.push(GetPerson);

/**
 * @class AddPerson
 */
class AddPerson extends Route {
	constructor() {
		super('person', 'ADD PERSON');
		this.verb = Route.Constants.Verbs.POST;
		this.auth = Route.Constants.Auth.USER;
		this.permissions = Route.Constants.Permissions.ADD;
	}

	_validate(req, res, token) {
		return new Promise((resolve, reject) => {
			if (!req.body.name ||
					!req.body.email) {
				this.log('ERROR: Missing required field', Route.LogLevel.ERR);
				reject({statusCode: 400});
				return;
			}

			resolve(true);
		});
	}

	_exec(req, res, validate) {
		return Model.Person.add(req.body, req.authApp._id)
			.then(Logging.Promise.logProp('Added Person', 'forename', Route.LogLevel.VERBOSE));

		// return new Promise((resolve, reject) => {
		//   Model.Person.add(req.body, req.appAuth._id)
		//     .then(Logging.Promise.logProp('Added Person', 'forename', Route.LogLevel.VERBOSE))
		//     .then(resolve, reject);
		// });
	}
}
routes.push(AddPerson);

/**
 * @class DeleteAllPeople
 */
class DeleteAllPeople extends Route {
	constructor() {
		super('person', 'DELETE ALL PEOPLE');
		this.verb = Route.Constants.Verbs.DEL;
		this.auth = Route.Constants.Auth.SUPER;
		this.permissions = Route.Constants.Permissions.DELETE;
	}

	_validate(req, res, token) {
		return Promise.resolve(true);
	}

	_exec(req, res, validate) {
		return Model.Person.rmAll()
			.then(() => true);
	}
}
routes.push(DeleteAllPeople);

/**
 * @class DeletePerson
 */
class DeletePerson extends Route {
	constructor() {
		super('person/:id', 'DELETE PERSON');
		this.verb = Route.Constants.Verbs.DEL;
		this.auth = Route.Constants.Auth.ADMIN;
		this.permissions = Route.Constants.Permissions.DELETE;
	}

	_validate(req, res, token) {
		return new Promise((resolve, reject) => {
			Model.Person
				.findById(req.params.id)
				.then((person) => {
					if (!person) {
						this.log('ERROR: Invalid Person ID', Route.LogLevel.ERR);
						reject({statusCode: 400, message: `ERROR: Invalid Person ID: ${req.params.id}`});
						return;
					}
					resolve(person);
				}, (err) => reject({statusCode: 400, message: err.message}));
		});
	}

	_exec(req, res, person) {
		return Model.Person.rm(person)
			.then(() => true);
	}
}
routes.push(DeletePerson);

/**
 * @type {*[]}
 */
module.exports = routes;
