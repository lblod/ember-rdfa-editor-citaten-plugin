import { isEmpty } from '@ember/utils';
import { computed } from '@ember/object';
import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/citaat-card';
import { inject as service } from '@ember/service';
import Citaat from '../../utils/citaat';
import { reads } from '@ember/object/computed';
import '../../models/custom-inflector-rules';
import { task } from 'ember-concurrency';

export default Component.extend({
  layout,
  editor: reads('info.editor'),
  hintsRegistry: reads('info.hintsRegistry'),
  hrId: reads('info.hrId'),
  location: reads('info.location'),
  store: service(),
  errors: null,
  pageNumber: 0,
  pageSize: 5,
  totalSize: null,
  insertHintActive: null,
  init() {
    this._super(...arguments);
    this.set('errors', []);
    this.set('message', '');
    this.set('insertHintActive', false);
  },
  loading: computed('initialLoad', 'search.isRunning', function() {
    return this.initialLoad || this.search.isRunning;
  }),
  async didReceiveAttrs() {
    this.set('initialLoad', true);
    const results = await this.info.query;
    this.set('initialLoad', false);
    this.set('totalSize', results.get('meta.count'));
    this.set('besluiten', results.map(r => this.parseResult(r)));
  },
  willDestroyElement() {
    this.set('errors', []);
  },
  removeHint() {
    this.get('hintsRegistry').removeHintsAtLocation(this.get('location'), this.get('hrId'), 'editor-plugins/citaat-card');
  },
  buildHTMLForHint(uri, title) {
    return "<a class=\"annotation\" href=\""+ uri +  "\" property=\"eli:cites\">" + title + "</a>&nbsp;";
  },

   search: task( function *() {
     const results = yield this.info.fetchPage(this.pageNumber);
     const count = results.meta.count;
     this.set('totalSize', count);
     this.set('besluiten', results.map((r) => this.parseResult(r)));
   }),
  parseResult(result) {
    const title = isEmpty(result.get('citeeropschrift')) ? result.get('titel') : result.get('citeeropschrift');
    return Citaat.create({
      title,
      citeeropschrift: this.info.match,
      uri: result.get('uri'),
      origModel: result
    });
  },
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
