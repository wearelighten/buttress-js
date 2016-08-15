'use strict';

var express = require('express');
var fs = require('fs');

class Config {
  constructor() {
    if (!process.env.SERVER_ID) {
      throw new Error('You must specify the SERVER_ID environment variable');
    }

    this._env = express().get('env');
    this._settings = this._loadSettings();
  }

  get settings() {
    return this._settings;
  }

  _loadSettings() {
    var json = fs.readFileSync('./config.json');
    var settings = JSON.parse(json);

    if (!settings.environments[process.env.SERVER_ID]) {
      throw new Error('You need to add config settings for your environment to config.json');
    }
    return Object.assign(settings.global, settings.environments[process.env.SERVER_ID]);
  }
}

module.exports = (new Config()).settings;
