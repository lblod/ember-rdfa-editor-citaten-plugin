import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency-decorators';
import { timeout } from 'ember-concurrency';
import { action } from '@ember/object';
import { LEGISLATION_TYPE_CONCEPTS } from '@lblod/ember-rdfa-editor-citaten-plugin/utils/legislation-types';
import { fetchDecisions } from '@lblod/ember-rdfa-editor-citaten-plugin/utils/vlaamse-codex';

const EDITOR_CARD_NAME = 'editor-plugins/citaat-card';

export default class CitaatCardComponent extends Component {
  @tracked pageNumber = 0;
  @tracked pageSize = 5;
  @tracked totalSize;
  @tracked decisions = [];
  @tracked error;
  @tracked showModal = false;
  @tracked decision;
  @tracked legislationTypeUri;
  @tracked text;

  constructor() {
    super(...arguments);
    if (this.args.info?.words) {
      this.text = this.args.info.words.join(" ");
      this.legislationTypeUri = this.args.info.type?.uri;
      this.search.perform();
    }
  }

  get legislationTypes() {
    return LEGISLATION_TYPE_CONCEPTS;
  }

  @task({restartable: true})
  * search() {
    this.error = null;
    try {
      // Split search string by grouping on non-whitespace characters
      // This probably needs to be more complex to search on group of words
      const words = (this.text || '').match(/\S+/g) || [];
      const filter = {
        type: this.legislationTypeUri,
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

  @action
  selectLegislationType(event) {
    this.legislationTypeUri = event.target.value;
    this.search.perform();
  }

  @task({restartable: true})
  * updateSearch() {
    yield timeout(200);
    yield this.search.perform();
  }

  @action
  openDecisionDetailModal(decision) {
    this.decision = decision;
    this.showModal = true;
  }

  @action
  openSearchModal() {
    this.decision = null;
    this.showModal = true;
  }

  @action
  closeModal() {
    this.showModal = false;
    this.decision = null;
  }

  @action
  insertCitation(type, uri, title) {
    this.hintsRegistry.removeHints({region: this.location, scope: EDITOR_CARD_NAME});
    const citationHtml = `${type ? type : ''} <a class="annotation" href="${uri}" property="eli:cites" typeof="eli:LegalExpression">${title}</a>&nbsp;`;
    const selection = this.editor.selectHighlight(this.location);
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

  get legislationType() {
    const type = this.legislationTypes.find((type) => type.value === this.legislationTypeUri);
    if (type)
      return type.label;
    else
      return "";
  }

}
