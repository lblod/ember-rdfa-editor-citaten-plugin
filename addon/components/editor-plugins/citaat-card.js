import { alias } from '@ember/object/computed';
import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/citaat-card';
import { inject as service } from '@ember/service';
import Citaat from '../../utils/citaat';
import { reads } from '@ember/object/computed';
import '../../models/custom-inflector-rules';
import { task, timeout } from 'ember-concurrency';
const DEBOUNCE_MS = 250;

export default Component.extend({
  layout,
  editor: reads('info.editor'),
  hintsRegistry: reads('info.hintsRegistry'),
  hrId: reads('info.hrId'),
  location: reads('info.location'),
  store: service(),
  results: alias('besluiten'),
  loading: alias('search.isRunning'),
  errors: null,
  pageNumber: 0,
  pageSize: 5,
  totalSize: null,
  init() {
    this._super(...arguments);
    this.set('errors', []);
    this.set('message', '');
    this.get('search').perform();
  },
  willDestroyElement() {
    this.set('errors', []);
  },
  removeHint() {
    this.get('hintsRegistry').removeHintsAtLocation(this.get('location'), this.get('hrId'), 'editor-plugins/citaat-card');
  },
  buildHTMLForHint(hint) {
    return "<a class=\"annotation\" href=\""+ hint.get("uri") +  "\" property=\"eli:cites\">" + hint.get("citeeropschrift") + "</a>&nbsp;";
  },

   search: task( function *() {
    let searchWords = this.get('info.words');
     let filter = this.buildFilter(searchWords);
     yield timeout(DEBOUNCE_MS);
     yield this.get('findAndHandleCitation').perform('besluit', 'besluiten', filter);
  }),

  buildFilter(words){
    let filter = {
      page: { number: this.get('pageNumber'), size: this.get('pageSize') },
      sort: '-score',
      'filter[titel]':  words
    };
    return filter;
  },
  findAndHandleCitation: task( function * (forType, setOnProperty, filter) {
    try {
      let result = yield this.get('store').query(forType, filter);
      this.set('totalSize', result.get('meta.count'));
      this.set(setOnProperty, result.map(r => this.parseResult(r)));
    }
    catch(e) {
      this.get('errors').pushObject('request for ' + forType + ' failed');
    }
  }),
  parseResult(result) {
    return Citaat.create({
      title: result.get('citeeropschrift'),
      uri: result.get('uri'),
      origModel: result
    });
  },
  actions: {
    insertHint(hint) {
      const updatedLocation = this.get('hintsRegistry').updateLocationToCurrentIndex(this.get('hrId'), this.get('location'));
      this.removeHint();
      this.get('editor').replaceTextWithHTML(...updatedLocation, this.buildHTMLForHint(hint));
    },
    prevPage() {
      this.set('pageNumber', this.get('pageNumber') - 1);
      this.search();
    },
    nextPage() {
      this.set('pageNumber', this.get('pageNumber') + 1);
      this.search();
    }
  }
});
