// Generated by CoffeeScript 1.6.3
(function() {
  var AWS, app, async, colors, currentProject, express, numberOfFields, parseProject, port, projectList, request, s3, walkTranslations, workspace;

  request = require('request');

  async = require('async');

  colors = require('colors');

  AWS = require('aws-sdk');

  express = require('express');

  projectList = ['galaxy_zoo', 'milky_way', 'planet_four', 'plankton', 'radio', 'sunspot', 'wise', 'worms'];

  numberOfFields = 0;

  workspace = {};

  currentProject = null;

  s3 = new AWS.S3({
    accessKeyId: process.env.AMAZON_ACCESS_KEY_ID,
    secretAccessKey: process.env.AMAZON_SECRET_ACCESS_KEY,
    region: 'us-east-1'
  });

  walkTranslations = function(rawTranslations) {
    var key, value, _results, _results1;
    if (rawTranslations.hasOwnProperty('__field')) {
      delete rawTranslations['__field'];
      _results = [];
      for (key in rawTranslations) {
        value = rawTranslations[key];
        if (key === 'en' || key === 'en-us' || key === 'en-US' || key === 'en_US') {
          key = 'en';
        }
        if (!(key in workspace)) {
          workspace[key] = {};
        }
        if (!(currentProject in workspace[key])) {
          workspace[key][currentProject] = 0;
        }
        _results.push(workspace[key][currentProject] += 1);
      }
      return _results;
    } else {
      _results1 = [];
      for (key in rawTranslations) {
        value = rawTranslations[key];
        _results1.push(walkTranslations(value));
      }
      return _results1;
    }
  };

  parseProject = function(project, cb) {
    var apiPath;
    currentProject = project;
    apiPath = "https://api.zooniverse.org/projects/" + project + "/translations";
    return request(apiPath, function(err, res, body) {
      if (err || res.statusCode === !200) {
        console.log('Err');
        console.log(err, res);
      }
      body = JSON.parse(body);
      walkTranslations(body.translation);
      return cb();
    });
  };

  app = express();

  app.get('/', function(req, res) {
    return res.send('goto /update_progress');
  });

  app.get('/update_progress', function(req, res) {
    return async.eachSeries(projectList, parseProject, function(error) {
      var enKeys, lang, project, _i, _j, _len, _len1, _ref;
      _ref = Object.keys(workspace);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        lang = _ref[_i];
        if (lang === 'en') {
          continue;
        }
        for (_j = 0, _len1 = projectList.length; _j < _len1; _j++) {
          project = projectList[_j];
          if (!(project in workspace[lang])) {
            continue;
          }
          enKeys = workspace['en'][project];
          workspace[lang][project] = Math.floor(workspace[lang][project] / enKeys * 100);
        }
      }
      return s3.putObject({
        Body: new Buffer(JSON.stringify(workspace)),
        Bucket: 'zooniverse-demo',
        Key: "translation-progress.json",
        ACL: 'public-read'
      }, function(err, data) {
        return res.send({
          updated: true
        });
      });
    });
  });

  port = process.env.PORT || 3004;

  app.listen(port, function() {
    return console.log("Listening on " + port);
  });

}).call(this);