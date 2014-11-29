/* jshint node:true */

var argv = require('yargs').argv;
var orbweaver = require('./lib/orbweaver.js');
var lodash = require('lodash');
var http = require('http');
var _ = require('lodash');

var root = argv._[0];

if (!root) {
  usage();
}

var options = {
  ignoreStatic: argv['ignore-static'],
  ignoreExtensions: argv['ignore-extensions'],
  ignore: argv['ignore'],
  parallel: argv['parallel'],
  timeout: argv['timeout'],
  limit: argv['limit'],
  random: argv['random'],
  interval: argv['interval'],
  metrics: argv['metrics']
};


var users = argv.users || 1;

if (users > 5) {
  // Should look like separate machines
  http.globalAgent.maxSockets = users;
}

var i;
for (i = 0; (i < users); i++) {
  var _options = _.clone(options);
  _options.id = i;
  orbweaver(root, _options, function() {
    console.log('* session ended');
  });
}

function usage() {
  console.log('Usage: orbweaver http://example.com [--parallel=6] [--ignore-static] [--ignore-extensions=gif,jpg,png,js,css] [--ignore=regexp] [--timeout=60000]');
  process.exit(1);
}
