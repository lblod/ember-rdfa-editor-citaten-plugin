# @lblod/ember-rdfa-editor-citaten-plugin

RDFa editor plugin to insert citations of a legal resource or legal expression level.

## Installation
```
ember install @lblod/ember-rdfa-editor
ember install @lblod/ember-rdfa-editor-citaten-plugin
```

## Configuration
### Dispatcher configuration
The plugin will automatically be added in the `default` and `all` editor profiles in `app/config/editor-profiles.js`. Add the plugin name `rdfa-editor-citaten-plugin` to other editor profiles if you want to enable the plugin in these profiles, too.

Once the plugin is configured in the appropriate editor profiles in `app/config/editor-profiles.js` it will be automatically be picked up by the rdfa-editor.

### Models
On installation the plugin will generate a `artikel` and `besluit` model. In case the host application already contains one of these models, the plugin's model can be merged in the existing model using the `<name>-model` mixin.

E.g.
```javascript
import Model from 'ember-data/model';
import BesluitModelMixin from '@lblod/ember-rdfa-editor-citaten-plugin/mixins/besluit-model';

export default Model.extend(BesluitModelMixin, {
  // your template model here
});
```


