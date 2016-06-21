var resolve = require('url').resolve;
var _ = require('lodash');
var request = require('request');
var async = require('async');
var quote = require('regexp-quote');
var htmlparser = require('htmlparser2');

module.exports = function(root, options, finalCallback) {
  if (!options) {
    options = {};
  }

  if (options['ignoreStatic']) {
    options['ignoreExtensions'] = 'gif,jpg,png,js,xlx,pptx,docx,css,ico,pdf';
  }

  if (options['ignoreExtensions']) {
    options.ignore = new RegExp('\\.(' + options['ignoreExtensions'].replace(/,/gi, '|') + ')$');
  }

  var filterAttributes = options.filterAttributes || function(url, attribs) {
    if (attribs.href) {
      return [ attribs.href ];
    }
    return [];
  };

  var seen = {};
  var queue = async.queue(crawl, options.parallel || 6);
  queue.drain = function() {
    return finalCallback(null);
  };
  queue.push({ url: root, referrer: '*' });

  var queued = 0;

  function crawl(info, callback) {
    var url = info.url;
    var interval = (options.interval || 0);
    var range = interval.toString().split(/\-/);
    if (range.length === 2) {
      interval = Math.random() * (range[1] - range[0]) + range[0];
    }
    setTimeout(function() {
      if (!options.metrics) {
        console.log(url);
      }
      var start = Date.now();
      return request({
        url: url,
        timeout: options.timeout || 60000
      }, function(err, response, body) {

        if (err && err.code === 'ETIMEDOUT') {
          response = { statusCode: 'ETIMEDOUT' };
          body = '';
        }

        var end = Date.now();
        if (!response) {
          response = {
            statusCode: 'NO RESPONSE BUT NOT A TIMEOUT'
          };
        }
        if (options.metrics) {
          console.log(info.referrer + ' -> ' +
            url + ': ' + response.statusCode + ' (' + Math.round(end - start) + 'ms) ' +
            (options.id ? (' [' + options.id + ']') : ''));
        }
        if (err) {
          return callback(null);
        }
        if (response.statusCode >= 400) {
          return callback(null);
        }
        var links = [];
        var parser = new htmlparser.Parser({
          onopentag: function(name, attribs) {
            links = links.concat(filterAttributes(url, attribs) || []);
          }
        }, {
          decodeEntities: true
        });
        parser.write(body || '');
        parser.end();
        if (options.random) {
          links = _.shuffle(links);
        }
        _.each(links, function(href) {
          href = resolve(root, href);
          if (options.ignore) {
            if (href.match(new RegExp(options.ignore))) {
              return;
            }
          }
          if (!href.match(new RegExp('^' + quote(root)))) {
            // Do not follow external links
            return;
          }
          if (!_.has(seen, href)) {
            if ((!options.limit) || (queued < options.limit)) {
              seen[href] = true;
              queue.push({ url: href, referrer: url });
              queued++;
            }
          }
        });
        return callback(null);
      }).setMaxListeners(20);
    }, interval);
  }
};
