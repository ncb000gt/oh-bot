var util = require('util');

function Handler(opts) {
  if (opts.statuses) {
    for (var p in opts.statuses) {
      this.statuses[p] = opts.statuses[p];
    }
  }

  if (opts.crawler) {
    this.crawler = opts.crawler;

    for (var status in this.statuses) {
      this.crawler.on(status, this.statuses[status]);
    }
  }
}

exports.createHandler = function(opts) {
  return new Handler(opts);
}

Handler.prototype.statuses = {
  200: function(data) {
         console.log('Default Handler (200): ' + util.inspect(data, true, 2));
       },
  301: function(data) {
         console.log('Default Handler (301): ' + util.inspect(data, true, 2));
       },
  302: function(data) {
         console.log('Default Handler (302): ' + util.inspect(data, true, 2));
       },
  303: function(data) {
         console.log('Default Handler (303): ' + util.inspect(data, true, 2));
       },
  404: function(data) {
         console.log('Default Handler (404): ' + util.inspect(data, true, 2));
       },
  500: function(data) {
         console.log('Default Handler (500): ' + util.inspect(data, true, 2));
       }
};
