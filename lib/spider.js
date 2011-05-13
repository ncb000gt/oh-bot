var emitter = require('events').EventEmitter,
    util = require('util');

function Spider(opts) {
  emitter.call(this);
}
util.inherits(Spider, emitter);

exports.createCrawler = function(opts) {
  return new Spider(opts);
}

Spider.prototype.crawl = function(opts) {
  var self = this;
  
  //simulate some data for now.
  setTimeout(function() {
    self.emit('404', {url: 'http://www.dgdsfgsd.com/'});
  }, 1000);
}
