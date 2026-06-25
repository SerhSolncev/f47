const path = require('path');
const fs = require('fs-extra');
const Nunjucks = require('nunjucks');

class Templater {
  constructor() {
    this.store = {};
    this.env = null;
    this.templatePaths = null;
    this.templaterLoader = null;
    this.Nunjucks = Nunjucks;
  }

  init(settings, store) {

    this.templaterLoader = new this.Nunjucks.FileSystemLoader(settings.partials, {
      watch: true,
      noCache: true,
    });

    this.env = new this.Nunjucks.Environment(this.templaterLoader, { autoescape: false });
  }
}

module.exports = Templater;
