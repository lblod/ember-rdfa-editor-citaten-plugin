# @lblod/ember-rdfa-editor-citaten-plugin

RDFa editor plugin to insert citations of a legal resource or legal expression level.

Compatibility
------------------------------------------------------------------------------

* Ember.js v3.24 or above
* Ember CLI v3.24 or above
* Node.js v12 or above


Installation
------------------------------------------------------------------------------
```
ember install @lblod/ember-rdfa-editor
ember install @lblod/ember-rdfa-editor-citaten-plugin
```


### Using the plugin

This plugin can be triggered by typing one of the following in the correct RDFa context (the `besluit:motivering` inside a `besluit:Besluit`).

 * [a-z]+decreet (e.g "gemeentedecreet")
 * decreet [words to search for]
 * omzendbrief [words to search for]
 * verdrag [words to search for]
 * samenwerkingsakkoord [words to search for]
 * wetboek [words to search for]
 * wet [words to search for]
 * koninklijk besluit [words to search for]
 * ministerieel besluit [words to search for]
 * besluit van de vlaamse regering [words to search for]
 * protocol [words to search for]
 * grondwet
 * grondwetswijziging [words to search for]
 * gecoordineerde wetten [words to search for]

## Configuration
### Dispatcher configuration
The plugin will automatically be added in the `default` and `all` editor profiles in `app/config/editor-profiles.js`. Add the plugin name `rdfa-editor-citaten-plugin` to other editor profiles if you want to enable the plugin in these profiles, too.

Once the plugin is configured in the appropriate editor profiles in `app/config/editor-profiles.js` it will be automatically be picked up by the rdfa-editor.

Contributing
------------------------------------------------------------------------------

See the [Contributing](CONTRIBUTING.md) guide for details.


License
------------------------------------------------------------------------------

This project is licensed under the [MIT License](LICENSE.md).
