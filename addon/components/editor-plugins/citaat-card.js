import { computed } from '@ember/object';
import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/citaat-card';
import { inject as service } from '@ember/service';
import { reads } from '@ember/object/computed';
import { task } from 'ember-concurrency';

export default Component.extend({
  layout,

  editor: reads('info.editor'),
  hintsRegistry: reads('info.hintsRegistry'),
  hrId: reads('info.hrId'),
  location: reads('info.location'),

  store: service(),

  pageNumber: 0,
  pageSize: 5,
  totalSize: null,
  insertHintActive: null,

  init() {
    this._super(...arguments);
    this.set('message', '');
    this.set('insertHintActive', false);
  },

  loading: computed('initialLoad', 'search.isRunning', function() {
    return this.initialLoad || this.search.isRunning;
  }),

  didReceiveAttrs() {
    this.search.perform();
  },

  removeHint() {
    this.get('hintsRegistry').removeHintsAtLocation(this.get('location'), this.get('hrId'), 'editor-plugins/citaat-card');
  },

  search: task(function*() {
    const results = yield this.info.fetchPage(this.pageNumber);
    this.set('totalSize', results.totalCount);
    this.set('besluiten', results.decisions);
  }),

  actions: {
    toggleInsertHint(besluit) {
      this.toggleProperty('insertHintActive');
      this.set('currentBesluit', besluit);
    },

    insertHint(uri, title) {
      const updatedLocation = this.get('hintsRegistry').updateLocationToCurrentIndex(this.get('hrId'), this.get('location'));
      this.removeHint();

      const selection = this.editor.selectHighlight(updatedLocation);
      this.editor.update(selection, {
        set: {
          property: 'eli:cites',
          href: uri,
          tag: 'a',
          innerHTML: title
        }
      });
    },

    prevPage() {
      this.set('pageNumber', this.get('pageNumber') - 1);
      this.get('search').perform();
    },

    nextPage() {
      this.set('pageNumber', this.get('pageNumber') + 1);
      this.get('search').perform();
    }
  }
});
