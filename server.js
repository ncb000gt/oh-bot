var _spider = require('./lib/spider'),
    _handler = require('./lib/handler'),
    fs = require('fs'),
    url = require('url'),
    util = require('util'),
    express = require('express');

var LOG_PATH = '/var/log/oh-bot.log',
    logStream = fs.createWriteStream(LOG_PATH);

var app = express.createServer();
app.configure(function() {
  app.set('view engine', 'jade');
  app.set('views', __dirname + '/views');
  app.use(express.logger({buffer: true, stream: logStream}));
  app.use(express.static(__dirname + '/public'));
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.session({secret: '*-oh-* bot for the masses.'}));    
});

app.get('/stats/:domain', function(req, res) {
  res.render('domain_stats', {});
});

app.get('/stats', function(req, res) {
  res.render('stats', {});
});

app.post('/crawl', function(req, res) {
  var _domain = req.body.domain,
      p_domain = url.parse(_domain),
      crawler = _spider.createCrawler({
        host: p_domain.hostname,
        grace_period: 100 //ms
      });
  var handler = _handler.createHandler({crawler: crawler});

  crawler.on('done', function(urls) {
    console.log('Site crawl is done.');
    console.log('urls processed: ' + util.inspect(urls, true, 3));
  });

  crawler.crawl({
      path: p_domain.pathname
  });

  res.render('crawl', {
    host: p_domain.host,
    path: p_domain.pathname
  });
});

app.get('/', function(req, res) {
  res.render('main', {});
});

app.listen(9000);

process.on('exit', function() {
  console.log('Oh-bot is done showing it\'s OH-face...');
});

console.log('Oh-bot ready to show it\'s OH-face...');
