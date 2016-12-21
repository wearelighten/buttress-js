'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file call.js
 * @description Call model definition.
 * @module Model
 * @exports model, schema, constants
 * @author Chris Bates-Keegan
 *
 */

const mongoose = require('mongoose');

let schema = new mongoose.Schema();
let ModelDef = null;
let constants = {};

const status = [
  'unallocated',
  'allocated',
  'completed'
];
const Status = {
  UNALLOCATED: status[0],
  ALLOCATED: status[1],
  COMPLETED: status[2]
};

const connectionOutcome = [
  'no-answer',
  'engaged',
  'invalid-number',
  'connected-wrong-number',
  'connected-not-available',
  'connected'
];
const ConnectionOutcome = {
  NO_ANSWER: connectionOutcome[0],
  ENGAGED: connectionOutcome[1],
  INVALID: connectionOutcome[2],
  CONNECTED_WRONG_NUMBER: connectionOutcome[3],
  CONNECTED_NOT_AVAILABLE: connectionOutcome[4],
  CONNECTED: connectionOutcome[5]
};

const outcome = [
  'call-back',
  'not-interested',
  'appointment-made',
  'successful-transaction'
];
const Outcome = {
  CALL_BACK: outcome[0],
  NOT_INTERESTED: outcome[1],
  APPOINTMENT_MADE: outcome[2],
  SUCCESSFUL_TRANSACTION: outcome[3]
};

constants.Status = Status;
constants.ConnectionOutcome = ConnectionOutcome;
constants.Outcome = Outcome;

schema.add({
  name: String,
  status: {
    type: String,
    enum: status
  },
  _calllist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Calllist'
  },
  _company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  _person: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person'
  },
  connections: [{
    start: {
      type: Date,
      default: Date.create
    },
    end: {
      type: Date,
      default: Date.create
    },
    outcome: {
      type: String,
      enum: connectionOutcome
    }
  }],
  outcome: {
    type: String,
    enum: outcome
  },
  _callbackTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  metadata: [{key: String, value: String}]
});

ModelDef = mongoose.model('Call', schema);

module.exports.constants = constants;
module.exports.schema = schema;
module.exports.model = ModelDef;

