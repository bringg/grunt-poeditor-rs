'use strict';

var fs = require('fs'),
    path = require('path'),
    _ = require('underscore'),
    request = require('request'),
    keypath = require('keypather')();

var grunt;

var ENDPOINT = 'https://poeditor.com/api/';

module.exports = function(g) {
    grunt = g;
    grunt.registerMultiTask('poeditor', 'Call POEditor\'s APIs & download from a grunt task', function() {
        var data = this.data;
        var opts = this.options();

        // any command
        if (data.command) {
            data.command.apiToken = opts.apiToken;
            var done = this.async();
            callAPI(data.command, function(res) {
                grunt.log.writeln(res);
                done();
            });
        }
        // download
        else if (data.download) {
            var downloadMeta = confLanguages(data.download, opts);
            downloadMeta.project = opts.project;
            download(downloadMeta, opts, this.async());
        }
        // download_all
        else if (data.download_all) {
            var done = this.async();
            opts = data.download_all.options || opts;
            getLanguagesToDownload(data.download_all, opts, function(err, languages) {
              if(err) {
                done(err);
                return;
              }

              opts.languages = _.extend(languages, opts.languages_override);
              grunt.log.writeln('Will download: ' + Object.keys(opts.languages).join(', '));

              var downloadMeta = confLanguages(data.download_all, opts);
              downloadMeta.project = opts.project;
              download(downloadMeta, opts, done);
            });
        }
    });
};

function getLanguagesToDownload(data, config, callback) {
    var creds = {
        api_token: config.apiToken,
        id: config.project,
        action: 'list_languages'
    };

    request.post(ENDPOINT, {form: creds, json: true}, function(err, response, body) {
        if (err) {
          callback(err);
          return;
        }

        if(!body.list) {
          callback(new Error('No body.list'));
          return;
        }

        var languagesToDownload = _.filter(body.list, function(lang) {
          return lang.percentage > data.minimum_coverage;
        });

        var languagesList = {};
        _.each(languagesToDownload, function(lang) {
          languagesList[lang.code] = lang.code;
        });

        callback(null, languagesList);
    });
}

function download(data, opts, done) {
    data.apiToken = opts.apiToken;
    data.langs = [];
    for (var plang in data.languages.toLocal)
        data.langs.push(plang);

    recursiveGetExports(data, {}, function(exports) {
        for (var polang in exports) {
            grunt.log.writeln('->'.green, polang+':', exports[polang]);
        }
        downloadExports(exports, data, function(paths) {
            for (var i in paths)
                grunt.log.writeln('->'.red, paths[i]);
            done();
        });
    });
}

function recursiveGetExports(data,output,done) {
    if (!data.langs.length) {
        done(output);
        return;
    }
    var creds = {
        api_token: data.apiToken,
        id: data.project,
        action: 'export',
        type: 'key_value_json',
        'language': data.langs.pop()
    };
    request.post(ENDPOINT, {form: creds}, function(err, response, body) {
        if (err)
            throw err;
        body = JSON.parse(body);
        if (body.item)
            output[creds.language] = body.item;
        recursiveGetExports(data, output, done);
    });
}

function downloadExports(exports, data, handler) {

    var numDownloads = 0;
    for (var polang in exports)
        numDownloads++;

    var paths = [];
    for (var polang in exports) {

        var url = exports[polang];
        var lang = data.languages.toLocal[polang];
        var path = data.dest.replace('?', lang);

        paths.push(path);
        downloadExport(url, path, function() {

            if (--numDownloads == 0)
                handler(paths);
        });
    }
}

function downloadExport(url, path, handler) {
    request.get(url, function(err, response, body) {
        if (err || response.statusCode !== 200) {
            throw "Problem getting file";
        }

        var translations = JSON.parse(body);

        // Remove empty/null translations
        translations = _.omit(keypath.flatten(translations), _.isEmpty);

        translations = JSON.stringify(keypath.expand(translations), null, 2);
        // Dump the json contents to a file
        fs.writeFile(path, translations, function(err) {
            if (err) {
                throw err;
            }
            handler();
        });
    });
}

function callAPI(command, handler) {

    var postData = querystring.stringify(command);

    var req = https.request({
        host: 'poeditor.com',
        port: 443,
        path: '/api/',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length
        }
    },
    function(res) {
        res.setEncoding('utf8');
        res.on('data', function(data) {
            var res = JSON.parse(data);
            handler(res, command);
        });
    });

    req.write(postData);
    req.end();
}


function confLanguages(obj, opts) {
    cleanLanguages(obj);
    if (!obj.languages)
        obj.languages = cleanLanguages(opts).languages;
    return obj;
}

function cleanLanguages(obj) {
    if (obj.languages) {
        var langs = {
            toPOE: {},
            toLocal: {}
        };
        var langdict = obj.languages;
        for (var poeL in langdict) {
            var locL = langdict[poeL];
            langs.toPOE[locL] = poeL;
            langs.toLocal[poeL] = locL;
        }
        obj.languages = langs;
    }
    return obj;
}
