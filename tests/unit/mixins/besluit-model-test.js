import EmberObject from '@ember/object';
import BesluitModelMixin from 'ember-rdfa-editor-citaten-plugin/mixins/besluit-model';
import { module, test } from 'qunit';

module('Unit | Mixin | besluit model', function() {
  // Replace this with your real tests.
  test('it works', function(assert) {
    let BesluitModelObject = EmberObject.extend(BesluitModelMixin);
    let subject = BesluitModelObject.create();
    assert.ok(subject);
  });
});
