import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { task, timeout } from 'ember-concurrency';
import { LEGISLATION_TYPES, LEGISLATION_TYPE_CONCEPTS } from '../../../utils/legislation-types';
import { fetchDecisions } from '../../../utils/vlaamse-codex';

export default class EditorPluginsCitationsModalComponent extends Component {
  @tracked text
  // Vlaamse Codex currently doesn't contain captions and content of decisions
  // @tracked isEnabledSearchCaption = false
  // @tracked isEnabledSearchContent = false
  @tracked legislationTypeUri
  @tracked pageNumber = 0
  @tracked pageSize = 5
  @tracked totalCount
  @tracked decisions = []
  @tracked error
  @tracked selectedDecision

  constructor() {
    super(...arguments);
    this.selectedDecision = this.args.selectedDecision;
    this.legislationTypeUri = this.args.legislationTypeUri || LEGISLATION_TYPES['decreet'];
    this.text = (this.args.words || []).join(' ');
    this.search.perform();
  }

  get legislationTypes() {
    return LEGISLATION_TYPE_CONCEPTS;
  }
  @(task(function * () {
    yield timeout(500);
    yield this.search.perform();
  }).keepLatest()) searchText

  @(task(function * (pageNumber) {
    this.pageNumber = pageNumber || 0; // reset page to 0 for a new search task
    this.error = null;
    try {
      // Split search string by grouping on non-whitespace characters
      // This probably needs to be more complex to search on group of words
      const words = (this.text || '').match(/\S+/g) || [];
      const filter = { type: this.legislationTypeUri };
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
  }).keepLatest()) search

  @action
  selectLegislationType(event) {
    this.legislationTypeUri = event.target.value;
    this.search.perform();
  }

  @action
  insertDecisionCitation(decision) {
    this.args.insertCitation(decision.legislationType.label, decision.uri, decision.title);
    this.args.closeModal();
  }

  @action
  insertArticleCitation(decision, article) {
    const title = `${decision.title}, ${article.number}`;
    this.args.insertCitation(decision.legislationType.label, article.uri, title);
    this.args.closeModal();
  }

  @action
  closeDecisionDetail() {
    this.selectedDecision = null;
  }

  @action
  openDecisionDetail(decision) {
    this.selectedDecision = decision;
  }


  // Pagination

  @action
  previousPage() {
    this.search.perform(this.pageNumber - 1);
  }

  @action
  nextPage() {
    this.search.perform(this.pageNumber + 1);
  }

  get rangeStart() {
    return this.pageNumber * this.pageSize + 1;
  }

  get rangeEnd() {
    const end = this.rangeStart + this.pageSize - 1;
    return end > this.totalCount ? this.totalCount : end;
  }

  get isFirstPage() {
    return this.pageNumber == 0;
  }

  get isLastPage() {
    return this.rangeEnd == this.totalCount;
  }

}
