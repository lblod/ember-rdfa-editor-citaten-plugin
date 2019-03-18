import Controller from '@ember/controller';
import { inject } from '@ember/service';
export default Controller.extend({
  plugin: inject('rdfa-editor-citaten-plugin'),
  actions: {
    trigger() {
      this.plugin.get('execute').perform(1, [], {}, {});
    }
  }
})
