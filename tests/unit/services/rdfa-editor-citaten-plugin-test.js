import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Service | rdfa editor citaten plugin', function(hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function(assert) {
    let service = this.owner.lookup('service:rdfa-editor-citaten-plugin');
    assert.ok(service);
  });
});
