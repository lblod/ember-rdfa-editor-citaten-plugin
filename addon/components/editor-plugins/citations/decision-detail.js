import Component from '@glimmer/component';
import { timeout } from 'ember-concurrency';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { fetchArticles } from '../../../utils/vlaamse-codex';
import { task } from 'ember-concurrency-decorators';

export default class EditorPluginsCitationsDecisionDetailComponent extends Component {
  @tracked error
  @tracked pageNumber = 0
  @tracked pageSize = 5
  @tracked totalCount
  @tracked articles = []
  @tracked articleFilter

  constructor() {
    super(...arguments);
    this.search.perform();
  }

  @task({restartable: true})
  *updateArticleFilter() {
    yield timeout(200);
    this.pageNumber = 0;
    yield this.search.perform(this.pageNumber);
  }

  @task({restartable: true})
  *search (pageNumber) {
    this.pageNumber = pageNumber || 0;
    this.error = null;
    try {
      const results = yield fetchArticles(this.args.decision.uri, this.pageNumber, this.pageSize, this.articleFilter);
      this.totalCount = results.totalCount;
      this.articles = results.articles;
    }
    catch(e) {
      console.warn(e); // eslint-ignore-line no-console
      this.totalCount = 0;
      this.articles = [];
      this.error = e;
    }
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
