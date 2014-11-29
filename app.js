/* jshint node:true */

var argv = require('yargs').argv;
var cheerio = require('cheerio');
var resolve = require('url').resolve;
var _ = require('lodash');
var request = require('request');
var async = require('async');
var quote = require('regexp-quote');

if (!argv._[0]) {
  usage();
}

var seen = {};

var queue = async.queue(crawl, argv.parallel || 6);
var root = argv._[0];
push(root);

function push(url) {
  // Trying to combat stack crashes
  setImmediate(function() {
    queue.push(url);
  });
}

function crawl(url, callback) {
  setImmediate(function() {
    console.log(url);
    return request(url, function(err, response, body) {
      if (err) {
        return callback(null);
      }
      if (response.statusCode >= 400) {
        return callback(null);
      }
      var $ = cheerio.load(body);
      var links = $('[href]');
      _.each(links, function(link) {
        var href = $(link).attr('href');
        href = resolve(root, href);
        if (argv.ignore) {
          if (href.match(new RegExp(argv.ignore))) {
            return;
          }
        }
        href = href.replace(/\#.*$/, '');
        if (href.match(/\.(gif|jpg|png|css|js|ico|pdf|xls|xlsx|doc|docx|ppt|pptx)$/)) {
          return;
        }
        if (!href.match(new RegExp('^' + quote(root)))) {
          // Do not follow external links
          return;
        }
        if (!_.has(seen, href)) {
          seen[href] = true;
          push(href);
        }
      });
      return callback(null);
    }).setMaxListeners(20);
  });
}

function usage() {
  console.error('Usage: orbweaver URL');
}
