var _ = require('underscore');
var constants = require('./constants.js');
var Downloader = require('./download.js');
var fs = require('fs');
var request = require('request');
var stream = require('stream');

var Uploader = function(
    lang,
    endpoint,
    token
) {
    this.lang = lang;
    this.endpoint = endpoint;
    this.token = token;
}

Uploader.prototype.writeContentsToFile = function(contents, done) {
    fs.writeFile(__dirname + '/.tmp.json', contents, function(err) {
        if (err) {
            throw err;
        }

        done(__dirname + '/.tmp.json');
    });
};

Uploader.prototype.persistChanges = function(poData) {
    var translationsAdded = poData.length;
    var dataString = JSON.stringify(poData);

    this.writeContentsToFile(dataString, function(fileName) {
        var creds = {
            api_token: this.token,
            id: constants.PROJECT_ID,
            action: 'upload',
            updating: 'terms_definitions',
            language: this.lang,
            overwrite: "0",
            file: fs.createReadStream(fileName)
        };

        request.post({url: this.endpoint, formData: creds}, function(err, response, body) {
            if (err) {
                throw err;
            }

            console.log(translationsAdded + ' translations uploaded for language, ' + this.lang);
            fs.unlinkSync(fileName);
        }.bind(this));
    }.bind(this));
};

Uploader.prototype.calculateChanges = function(localContent, serverContent) {
    var keysFromServer = _.keys(serverContent);
    var changes = _.pick(localContent, function (value, key, obj) {
        return !_.contains(keysFromServer, key);
    });

    var changeArray = _.map(changes, function (change, changeKey) {
        return {
            term: changeKey,
            definition: change
        }
    });

    if (changeArray.length === 0) {
        throw "No changes to persist";
    }

    return changeArray;
};

Uploader.prototype.uploadPoChanges = function() {
    fs.readFile(__dirname + constants.OUTPUT_FILE, null, function(err, content) {
        var json = JSON.parse(content);

        // Get the source from the server
        var downloader = new Downloader(this.lang, this.endpoint, this.token, function(content) {
            var changes = this.calculateChanges(json, content);
            this.persistChanges(changes);
        }.bind(this));

        downloader.downloadTranslations();
    }.bind(this));
};

if (process.argv.length < 3) {
    console.log('Usage: node ' + path.basename(process.argv[1]) + ' <lang>');
    process.abort();
}

var uploader = new Uploader(process.argv[2], constants.ENDPOINT, constants.API_KEY)
uploader.uploadPoChanges();