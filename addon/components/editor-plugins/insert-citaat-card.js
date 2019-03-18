import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/insert-citaat-card';

export default Component.extend({
  layout,
  tagName: '',
  title: null,
  didReceiveAttrs() {
    if (this.besluit) {
      this.title = this.besluit.title;
    }
  },
  actions: {
    cancel() {
      this.toggleInsertHint();
    },
    insert() {
      this.insertHint(this.besluit.uri, this.title);
    }
  }
});
