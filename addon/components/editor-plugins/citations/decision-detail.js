import Component from '@glimmer/component';
import { timeout } from 'ember-concurrency';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { fetchArticles } from '../../../utils/vlaamse-codex';
import { task } from 'ember-concurrency-decorators';
import { useTask } from 'ember-resources';

export default class EditorPluginsCitationsDecisionDetailComponent extends Component {
  @tracked error;
  @tracked pageNumber = 0;
  @tracked pageSize = 5;
  @tracked totalCount;
  @tracked articles = [];
  @tracked articleFilter;
  @tracked articleFilterAfterTimeout;

  constructor() {
    super(...arguments);
  }

  @task({ restartable: true })
  *updateArticleFilter() {
    yield timeout(500);
    this.pageNumber = 0;
    this.articleFilterAfterTimeout = this.articleFilter;
  }

  articleResource = useTask(this, this.resourceSearch, () => [
    this.pageNumber,
    this.pageSize,
    this.articleFilterAfterTimeout,
  ]);

  @task({ restartable: true })
  *resourceSearch() {
    this.error = null;
    const abortController = new AbortController();
    const signal = abortController.signal;
    try {
      const results = yield fetchArticles(
        this.args.decision.uri,
        this.pageNumber,
        this.pageSize,
        this.articleFilterAfterTimeout,
        signal
      );
      this.totalCount = results.totalCount;
      return results.articles;
    } catch (e) {
      console.warn(e); // eslint-ignore-line no-console
      this.totalCount = 0;
      this.error = e;
      return [];
    } finally {
      abortController.abort();
    }
  }

  @action
  close() {
    this.articleResource.cancel();
    this.args.close();
  }

  // Pagination

  @action
  previousPage() {
    --this.pageNumber;
  }

  @action
  nextPage() {
    ++this.pageNumber;
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
