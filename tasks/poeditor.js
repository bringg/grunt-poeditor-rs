'use strict';

var fs = require('fs'),
    path = require('path'),
    request = require('request'),
    _ = require('underscore'),
    keypath = require('keypather')();

var grunt;

module.exports = function(g) {
    grunt = g;
    grunt.registerMultiTask('poeditor',
    'Call POEditor\'s APIs & download from a grunt task',
    function() {

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
        });
};

function download(data, opts, done) {

    data.apiToken = opts.apiToken;

    var reqeusts = _.map(data.languages.toLocal, function(plang) {
       return _.assign({}, data, { language: plang });
    });

    // data.langs = [];
    // for (var plang in data.languages.toLocal)
    //     data.langs.push(plang);
    //

    var async = require('async');

    console.time('Dispatch');
    async.map(reqeusts, getExport, function(err, output) {
        console.timeEnd('Dispatch');

        grunt.log.writeln('Finished ' + reqeusts.length +  ' requests', err, output);
        if(err) {
            throw err;
        }

        var exports = _.reduce(output, function(exportLang, exports) {
            // The original code, skips languages without body.item
            if(!exportLang.body.item) {
                return;
            }

            exports[exportLang.language] = exportLang.body.item;
            grunt.log.writeln('->'.green, exportLang.language+':', exportLang.body.item);
        }, {});

        downloadExports(exports, data, function(paths) {
            for (var i in paths)
                grunt.log.writeln('->'.red, paths[i]);
            done();
        });
    });

    // recursiveGetExports(data, {}, function(exports) {
    //     for (var polang in exports) {
    //         grunt.log.writeln('->'.green, polang+':', exports[polang]);
    //     }
    //     downloadExports(exports, data, function(paths) {
    //         for (var i in paths)
    //             grunt.log.writeln('->'.red, paths[i]);
    //         done();
    //     });
    // });
}

function getExport(data, cb) {
    var creds = {
        api_token: data.apiToken,
        id: data.project,
        action: 'export',
        type: 'key_value_json',
        'language': data.language
    };
    var endpoint = 'https://poeditor.com/api/';

    console.time('Fetching ' + creds.language);
    request.post(endpoint, {form: creds, gzip: true}, function(err, response, body) {
        console.timeEnd('Fetching ' + creds.language);
        if (err) {
            cb(err, null);
            return;
        }

        body = JSON.parse(body);
        cb(null, { language: data.language, body: body });

        // if (body.item)
        //     output[creds.language] = body.item;
        // recursiveGetExports(data, output, done);
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
    var endpoint = 'https://poeditor.com/api/';
    request.post(endpoint, {form: creds}, function(err, response, body) {
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

        translations = JSON.stringify(keypath.expand(translations));
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
