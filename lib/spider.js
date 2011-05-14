var emitter = require('events').EventEmitter,
    util = require('util'),
    url = require('url'),
    htmlparser = require('htmlparser'),
    redback = require('redback').createClient(),
    http = require('http');

function Spider(opts) {
  emitter.call(this);
  var MIN_GRACE_PERIOD = 1000,
      MAX_CONCURRENT_GETS = 10;

  this._concurrent_gets = 0;
  this.host = opts.host || 'localhost';
  this.port = opts.port || 80;
  this.keep_to_same_origin = true; //TODO: make configurable.

  if ((opts.grace_period && opts.grace_period < MIN_GRACE_PERIOD) || !opts.grace_period) {
    this.grace_period = MIN_GRACE_PERIOD;
  } else {
    this.grace_period = opts.grace_period;
  }

  if ((opts.concurrent_gets && opts.concurrent_gets > MAX_CONCURRENT_GETS) || !opts.concurrent_gets) {
    this.concurrent_gets = MAX_CONCURRENT_GETS;
  } else {
    this.concurrent_gets = opts.concurrent_gets;
  }

  //TODO: super naive for now...fix to use redis
  this.get_queue = [];
  this.urls = {};
  this.already_processed = {};
  this.started = false;

  var self = this;
  setInterval(function() {
    console.log("queue len: " + self.get_queue.length);
    if (self.get_queue.length > 0 && self._concurrent_gets <= self.concurrent_gets) {
      self._concurrent_gets++;
      self.get(self.get_queue.shift());
    } else if (self.started && self.get_queue.length === 0) {
      self.emit('done', self.urls);
      self.removeAllListeners();
    }
  }, self.grace_period);
}
util.inherits(Spider, emitter);

exports.createCrawler = function(opts) {
  return new Spider(opts);
}

Spider.prototype.crawl = function(opts) {
  console.log('Queued "http://' + this.host + opts.path + '" for checking.');
  this.get_queue.push(opts);
  this.started = true;
}

// make the actual request
Spider.prototype.get = function(opts) {
  var self = this;
  console.log('opts: ' + util.inspect(opts, true, 2));
  var req = http.request({
    method: "GET",
    host: (opts.host || self.host),
    port: (opts.port || self.port),
    path: opts.path
  },
  function(res) {
    var headers = res.headers;
    var status = res.statusCode;
    opts.status = res.statusCode;
    opts.host = self.host;
    opts.headers = headers;
    self.emit(status, opts);
    //TODO: get body for post processing and getting more links YA!
    var chunks = [];
    var len = 0;
    res.on('data', function(chunk) {
      chunks.push(chunk);
      len += chunk.length;
    });

    res.on('error', function(err) {
      self._concurrent_gets--;
    });

    res.on('end', function() {
      self._concurrent_gets--;
      var offset = 0;
      var buf = new Buffer(len);
      for (var i = 0; i < chunks.length; i++) {
        chunks[i].copy(buf, offset, 0);
        offset += chunks[i].length;
      }
      self.process(buf.toString(), opts);
    });
  });

  req.on('error', function(err) {
    self._concurrent_gets--;
    console.log('err on "' + opts.path + '" with: ' + err);
  });
  //for now no post data
  req.end();
}

Spider.prototype.handleLink = function(link, opts) {
  var self = this;

  if (!(link in self.urls)) {
    self.urls[link] = {
      status: opts.status,
      from: {}
    };
  }

  if (!(opts.path in self.urls[link].from)) {
    self.urls[link].from[opts.path] = '';
  }

  //don't need to reprocess
  if (!(link in self.already_processed)) {
    var p_link = url.parse(link);
    console.log(p_link.host + ' : ' + self.host);
    if (self.keep_to_same_origin && ((self.host === p_link.host) || !p_link.host)) {
      var new_opts = {path: link};
      if (p_link.host) {
        new_opts.host = p_link.host;
      }
      self.get_queue.push(new_opts);
    }
    self.already_processed[link] = ''; //no need to do this all again for the same shit...
  }
}

// get more links bro!
Spider.prototype.process = function(body, opts) {
  var self = this;

  if (opts.headers && opts.headers['content-type'] && opts.headers['content-type'].match(/text\/html/)) {
    var handler = new htmlparser.DefaultHandler(function (err, dom) {
      function handleEls(els) {
        for (var i = 0; i < els.length; i++) {
          var el = els[i];

          if (el && el.attribs) {
            if ((el.name === 'img' || el.name === 'script') && el.attribs.src) {
              self.handleLink(el.attribs.src, opts);
            } else if ((el.name === 'link' || el.name === 'a') && el.attribs.href) {
              self.handleLink(el.attribs.href, opts);
            }
          }

          if (el.children && el.children.length > 0) {
            handleEls(el.children);
          }
        }
      }

      handleEls(dom);
    });
    var parser = new htmlparser.Parser(handler);
    parser.parseComplete(body);
  }
}
