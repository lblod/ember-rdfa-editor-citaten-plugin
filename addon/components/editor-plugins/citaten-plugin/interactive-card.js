import Component from '@glimmer/component';
import { task } from 'ember-concurrency-decorators';
import { fetchDecisions } from '@lblod/ember-rdfa-editor-citaten-plugin/utils/vlaamse-codex';
import { LEGISLATION_TYPES, LEGISLATION_TYPE_CONCEPTS } from '../../../utils/legislation-types';
import { tracked } from '@glimmer/tracking';
import { timeout } from 'ember-concurrency';
import { action } from '@ember/object';

export default class EditorPluginsCitatenPluginInteractiveCardComponent extends Component {
  @tracked decisions;
  @tracked pageNumber = 0;
  @tracked totalCount = 0;
  @tracked legislationTypeUri;
  @tracked text;
  @tracked selection;

  constructor() {
    super(...arguments);
    this.legislationTypeUri = LEGISLATION_TYPES['decreet'];
  }

  get editor() {
    return this.args.info?.editor;
  }

  get rdfaBlock() {
    return this.args.info.rdfaBlock;
  }

  get legislationTypes() {
    return LEGISLATION_TYPE_CONCEPTS;
  }

  @action
  selectLegislationType(event) {
    this.legislationTypeUri = event.target.value;
    this.search.perform();
  }

  @action
  insertCitation(decisionUri, decisionTitle) {
    const typeLabel = LEGISLATION_TYPE_CONCEPTS.find((concept) => concept.value === decisionUri) || '';
    const citationHtml = `${typeLabel} <a class="annotation" href="${decisionUri}" property="eli:cites">${decisionTitle}</a>&nbsp;`;
    this.editor.executeCommand('insert-html', citationHtml);
  }

  @task({keepLatest: true})
  * updateSelection(event) {
      //unused atm
    this.selection = event.detail;
  }

  @task({restartable: true})
  * searchText() {
    yield timeout(500);
    yield this.search.perform();
  }

  @task({restartable: true})
  * search(pageNumber = 0) {
    this.pageNumber = pageNumber;
    this.error = null;
    try {
      // Split search string by grouping on non-whitespace characters
      // This probably needs to be more complex to search on group of words
      const words = (this.text || '').match(/\S+/g) || [];
      const filter = {
        type: this.legislationTypeUri
      };
      const results = yield fetchDecisions(words, filter, this.pageNumber, this.pageSize);
      this.totalCount = results.totalCount;
      this.decisions = results.decisions;
    }
    catch(e) {
      console.warn(e); // eslint-ignore-line no-console
      this.totalCount = 0;
      this.decisions = [];
      this.error = e;
    }
  }
}
