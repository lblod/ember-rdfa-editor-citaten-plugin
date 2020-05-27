import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency';
import { action } from '@ember/object';

const EDITOR_CARD_NAME = 'editor-plugins/citaat-card';

export default class CitaatCardComponent extends Component {
  @tracked pageNumber = 0
  @tracked pageSize = 5
  @tracked totalSize
  @tracked decisions = []
  @tracked error

  constructor() {
    super(...arguments);
    this.search.perform();
  }

  @(task(function * () {
    this.error = null;
    try {
      const results = yield this.fetchPage(this.pageNumber, this.legislationType.uri);
      this.totalSize = results.totalCount;
      this.decisions = results.decisions;
    }
    catch(e) {
      console.warn(e); // eslint-ignore-line no-console
      this.totalSize = 0;
      this.decisions = [];
      this.error = e;
    }
  })) search

  @action
  openInsertionModal() {
    console.log('not implemented');
  }

  @action
  openSearchModal() {
    console.log('not implemented');
  }

  @action
  insertCitation(uri, title) {
    const updatedLocation = this.hintsRegistry.updateLocationToCurrentIndex(this.hrId, this.location);
    this.hintsRegistry.removeHintsAtLocation(this.location, this.hrId, EDITOR_CARD_NAME);

    title = title.toLowerCase();
    const citationHtml = `${this.legislationType.label} <a class="annotation" href="${uri}" property="eli:cites">${title}</a>&nbsp;`;

    const selection = this.editor.selectHighlight(updatedLocation);
    this.editor.update(selection, {
      set: {
        innerHTML: citationHtml
      }
    });
  }

  @action
  prevPage() {
    this.pageNumber = this.pageNumber - 1;
    this.search.perform();
  }

  @action
  nextPage() {
    this.pageNumber = this.pageNumber + 1;
    this.search.perform();
  }

  get editor() {
    return this.args.info.editor;
  }

  get hintsRegistry() {
    return this.args.info.hintsRegistry;
  }

  get location() {
    return this.args.info.location;
  }

  get hrId() {
    return this.args.info.hrId;
  }

  get fetchPage() {
    return this.args.info.fetchPage;
  }

  get legislationType() {
    return this.args.info.type;
  }
}
