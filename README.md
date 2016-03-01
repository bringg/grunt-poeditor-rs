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

Parts of the grunt implementation were inspired by work of Philippe Vignau, https://github.com/Philoozushi/grunt-poeditor-pz.
