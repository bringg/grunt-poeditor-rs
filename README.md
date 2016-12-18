# grunt-poeditor-rs

This is an experimental library for importing po terms and definitions into a simple JSON file. Can also be used from within grunt. The standalone version also supports exporting terms and definitions to POEditor.

If you want to use the standalone scripts, rename `constants.js.example` to `constants.js` and change as appropriate.
If you want to use the grunt component, you can invoke it like this:

```
poeditor: {
    download: {
      download: {
        type: 'json',
        dest: 'translations.?.json' // ? will be replaced by a language code
      }
    },
    options: {
        apiToken: 'insert-your-token-here',
        languages: {
          'en-us': 'en',
          'ja': 'ja'
        },
        project: 'your projectID goes here (as a string)'
    }
  }
```

## Download all languages
Another task is to download all languages, with minimum poeditor coverage.

```
poeditor: {
  // 'download_languages' - name of your grunt task
  download_languages: {
    // 'download_all' - name of the grunt task to dowload all languages
    download_all: {
      // Same configuration as download
      dest: 'tests/?.json',

      // Specify minimum coverage here
      minimum_coverage: 40
    }
  },
  options: {
    apiToken: 'insert-your-token-here',

    // Override languages files if you don't want to use
    // poeditor language code.
    languages_override: {
      'vi': 'vi_VN'
    },
    project: 'your projectID goes here (as a string)'
  }
}
```

Parts of the grunt implementation were inspired by work of Philippe Vignau, https://github.com/Philoozushi/grunt-poeditor-pz.
