import { computed } from '@ember/object';
import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/citaat-card';
import { inject as service } from '@ember/service';
import { reads } from '@ember/object/computed';
import { task } from 'ember-concurrency';
import { warn } from '@ember/debug';

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

  async didReceiveAttrs() {
    this.set('initialLoad', true);
    try {
      const results = await this.info.query;
      this.set('totalSize', results.totalCount);
      this.set('besluiten', results.decisions);
    } catch (e) {
      warn(e, {
        id: 'citaat-card.init'
      });
    } finally {
      this.set('initialLoad', false);
    }
  },

  removeHint() {
    this.get('hintsRegistry').removeHintsAtLocation(this.get('location'), this.get('hrId'), 'editor-plugins/citaat-card');
  },

  buildHTMLForHint(uri, title) {
    title = title.toLowerCase();
    return "<a class=\"annotation\" href=\"" + uri + "\" property=\"eli:cites\">" + title + "</a>&nbsp;";
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
      this.get('editor').replaceTextWithHTML(...updatedLocation, this.buildHTMLForHint(uri, title));
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
