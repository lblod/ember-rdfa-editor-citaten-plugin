# @lblod/ember-rdfa-editor-citaten-plugin

RDFa editor plugin to insert references to a legal resource or legal expression into the document.

## Compatibility

* Ember.js v3.24 or above
* Ember CLI v3.24 or above
* Node.js v12 or above

## Installation

```bash
ember install @lblod/ember-rdfa-editor
ember install @lblod/ember-rdfa-editor-citaten-plugin
```

## Configuration

To enable this plugin on the editor, add `citaten-plugin` to the `@plugins` collection. E.g.:

```handlebars
<RdfaEditorWithDebug
  @plugins={{array 'citaten-plugin'}}
  ...
  >
  <h1>My app</h1>
</RdfaEditorWithDebug>
```

## Using the plugin

This plugin can be triggered by typing one of the following in the correct RDFa context (the `besluit:motivering` inside a `besluit:Besluit`).

* [specification]**decreet** [words to search for] *(e.g. "gemeentedecreet wijziging")*
* **omzendbrief** [words to search for]
* **verdrag** [words to search for]
* **grondwetswijziging** [words to search for]
* **samenwerkingsakkoord** [words to search for]
* [specification]**wetboek** [words to search for]
* **protocol** [words to search for]
* **besluit van de vlaamse regering** [words to search for]
* **gecoordineerde wetten** [words to search for]
* [specification]**wet** [words to search for] *(e.g. "kieswet wijziging", or "grondwet")*
* **koninklijk besluit** [words to search for]
* **ministerieel besluit** [words to search for]
* **genummerd besluit** [words to search for]

You should be able to add a reference manually by clicking on the `Insert` > `Insert reference` item in the Insert menu located on the top right of the editor. This will open the advanced search window. **Note** that this will only be avaliable in the proper context (see above in this section).

## Contributing

See the [Contributing](CONTRIBUTING.md) guide for details.

## License

This project is licensed under the [MIT License](LICENSE.md).
