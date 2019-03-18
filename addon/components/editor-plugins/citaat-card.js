import { alias } from '@ember/object/computed';
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
  loading: alias('search.isRunning'),
  errors: null,
  pageNumber: 0,
  pageSize: 5,
  totalSize: null,
  init() {
    this._super(...arguments);
    this.set('errors', []);
    this.set('message', '');
  },
  async didReceiveAttrs() {
    const results = await this.info.query;
    this.set('totalSize', results.get('meta.count'));
    this.set('besluiten', results.map(r => this.parseResult(r)));
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
     const results = yield this.info.query;
     const count = results.meta.count;
     this.set('totalSize', count);
     this.set('besluiten', results.map((r) => this.parseResult(r)));
   }),
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
      title: result.get('titel'),
      citeeropschrift: this.info.match,
      uri: result.get('uri'),
      origModel: result
    });
  },
  prevPage() {
    this.set('pageNumber', this.get('pageNumber') - 1);
    this.search();
  },
  nextPage() {
    this.set('pageNumber', this.get('pageNumber') + 1);
    this.search();
  },
  actions: {
    insertHint(hint) {
      const updatedLocation = this.get('hintsRegistry').updateLocationToCurrentIndex(this.get('hrId'), this.get('location'));
      this.removeHint();
      this.get('editor').replaceTextWithHTML(...updatedLocation, this.buildHTMLForHint(hint));
    }
  }
});
