import EmberObject from '@ember/object';
import ArtikelModelMixin from 'ember-rdfa-editor-citaten-plugin/mixins/artikel-model';
import { module, test } from 'qunit';

module('Unit | Mixin | artikel model');

// Replace this with your real tests.
test('it works', function(assert) {
  let ArtikelModelObject = EmberObject.extend(ArtikelModelMixin);
  let subject = ArtikelModelObject.create();
  assert.ok(subject);
});
