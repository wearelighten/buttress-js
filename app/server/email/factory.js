'use strict';

/**
 * Rhizome - The API that feeds grassroots movements
 *
 * @file factory.js
 * @description Email factory - creates valid html formatted emails based on templates
 * @module Email
 * @author Chris Bates-Keegan
 *
 */

const fs = require('fs');
const path = require('path');
const less = require('less');
const pug = require('pug');
const juice = require('juice');
const Logging = require('../logging');

class Factory {
  constructor() {
    this.css = null;
    this.parsers = new WeakMap();
  }

  /**
   * @param {Object} params - parameters to be passed into the pug parser
   * @return {Promise} - resolves to email-ready html
   */
  create(params) {
    return new Promise((resolve, reject) => {
      this._getCss(params)
        .then(css => {
          return this._getHtml(params, css);
        })
        .then(combined => {
          var email = {
            html: juice(combined.html, combined.css),
            subject: params.subject
          };
          resolve(email);
        })
        .catch(Logging.Promise.logError());
    });
  }

  clearTemplate(templatePathName) {
    this.parsers[templatePathName] = null;
  }

  /**
   * @param {Object} params - parameters to be passed into the pug parser
   * @param {String} css - compiled CSS string emitted from _getCss
   * @return {Promise} - promise that resolves to HTML
   * @private
   */
  _getHtml(params, css) {
    var templatePathName = path.join(params.app.templatePath, `${params.template}.pug`);
    params.style = css;

    if (this.parsers[templatePathName]) {
      var html = this.parsers[templatePathName](params);
      return Promise.resolve({html: html, css: css});
    }

    Logging.log('Parsing PUG', Logging.Constants.LogLevel.DEBUG);

    return new Promise((resolve, reject) => {
      Logging.log(templatePathName, Logging.Constants.LogLevel.DEBUG);
      fs.readFile(templatePathName, (err, input) => {
        if (err) {
          Logging.log(err, Logging.Constants.LogLevel.ERR);
          reject(err);
          return;
        }

        Logging.log(input.toString(), Logging.Constants.LogLevel.SILLY);
        var html = false;
        try {
          var options = {
            filename: templatePathName,
            basedir: path.join(__dirname, 'templates')
          };
          Logging.log(options, Logging.Constants.LogLevel.SILLY);

          this.parsers[templatePathName] = pug.compile(input.toString(), options);
          html = this.parsers[templatePathName](params);
        } catch (e) {
          reject(e);
          return;
        }
        Logging.log('Parsed PUG', Logging.Constants.LogLevel.DEBUG);
        Logging.log(html, Logging.Constants.LogLevel.SILLY);
        resolve({html: html, css: css});
      });
    });
  }

  /**
   * @return {Promise} - promise that resolves to CSS
   * @private
   */
  _getCss() {
    if (this.css !== null) {
      return Promise.resolve(this.css);
    }
    Logging.log('Compiling LESS', Logging.Constants.LogLevel.DEBUG);

    return new Promise((resolve, reject) => {
      var pathName = path.join(__dirname, 'styles', 'style.less');
      Logging.log(pathName, Logging.Constants.LogLevel.DEBUG);
      fs.readFile(pathName, (err, input) => {
        if (err) {
          Logging.log(err, Logging.Constants.LogLevel.ERR);
          reject(err);
          return;
        }

        Logging.log(input.toString(), Logging.Constants.LogLevel.SILLY);

        less.render(input.toString(), {filename: 'style.less', paths: [path.join(__dirname, 'styles')]})
          .then(output => {
            Logging.log('Compiled LESS', Logging.Constants.LogLevel.DEBUG);
            Logging.log(output.css, Logging.Constants.LogLevel.SILLY);
            this.css = output.css;
            resolve(this.css);
          })
          .catch(err => {
            Logging.log(pathName, Logging.Constants.LogLevel.ERR);
            Logging.log(err.message, Logging.Constants.LogLevel.ERR);
            Logging.log(`${err.line}:${err.column} - ${err.extract}`, Logging.Constants.LogLevel.ERR);
          });
      });
    });
  }
}

module.exports = new Factory();
