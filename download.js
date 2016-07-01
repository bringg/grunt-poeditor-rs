var fs = require('fs');
var path = require('path');
var request = require('request');

var PoDownloader = function (
    lang,
    endpoint,
    token,
    project_id,
    downloadComplete
) {
    this.endpoint = endpoint;
    this.token = token;
    this.lang = lang;
    this.project_id = project_id;
    this.downloadComplete = downloadComplete ? downloadComplete : this.exportTranslationData;
}

PoDownloader.prototype.exportTranslationData = function(content) {
    content = JSON.stringify(content, null, 4)
    process.stdout.write(content);
    return;

    var constants = require('./constants.js');
    fs.writeFile(__dirname + constants.OUTPUT_FILE, content, function(err) {
        if (err) {
            throw err;
        }
    });
}

PoDownloader.prototype.fileReceived = function(err, response, body) {
    if (err || response.statusCode !== 200) {
        throw "Problem getting file";
    }

    // var translations = parser.po.parse(body).translations[''];
    var translations = JSON.parse(body);

    // This translates the po data into something usable, basically an object of
    // {translationKey: translationText}
    var convertedTranslations = {};
    for (var key in translations) {
        var trans = translations[key];

        if (trans.term.length === 0) {
            continue;
        }

        convertedTranslations[trans.term] = trans.definition && trans.definition.length > 0
            ? trans.definition
            : trans.term;
    }

    // Dump the json contents to a file
    this.downloadComplete(convertedTranslations);
}

PoDownloader.prototype.requestComplete = function(err, response, body) {
    if (err) {
        throw err;
    }

    if (response.statusCode !== 200) {
        throw "Unable to find translation files for " + this.lang;
    }

    // This will return a response that contains a URL to the po file
    var json = JSON.parse(body);
    request.get(json.item, this.fileReceived.bind(this));
}

PoDownloader.prototype.downloadTranslations = function() {
    var creds = {
        api_token: this.token,
        id: this.project_id,
        action: 'export',
        language: this.lang,
        type: 'json'
    };

    request.post(this.endpoint, {form: creds}, this.requestComplete.bind(this))
}

if (require.main === module) {
    if (process.argv.length < 3) {
        console.log('Usage: node ' + path.basename(process.argv[1]) + ' <lang>');
        process.abort();
    }
    var constants = require('./constants.js');
    var project_id = process.argv[3] ? process.argv[3] : constants.PROJECT_ID;
    var downloader = new PoDownloader(process.argv[2], constants.ENDPOINT, constants.API_KEY, project_id, null)
    downloader.downloadTranslations();
}

module.exports = PoDownloader;
