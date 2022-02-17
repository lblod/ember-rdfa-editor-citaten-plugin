import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency-decorators';
import { timeout } from 'ember-concurrency';
import { action } from '@ember/object';
import { LEGISLATION_TYPE_CONCEPTS } from '@lblod/ember-rdfa-editor-citaten-plugin/utils/legislation-types';
import { fetchDecisions } from '@lblod/ember-rdfa-editor-citaten-plugin/utils/vlaamse-codex';

import matchRegex from '../../utils/matchRegex';

const EDITOR_CARD_NAME = 'editor-plugins/citaat-card';
const DECISION_TYPES = [
  'http://data.vlaanderen.be/ns/mandaat#OntslagBesluit',
  'http://data.vlaanderen.be/ns/mandaat#AanstellingsBesluit',
  'http://data.vlaanderen.be/ns/besluit#Besluit',
];

export default class CitaatCardComponent extends Component {
  @tracked pageNumber = 0;
  @tracked pageSize = 5;
  @tracked totalSize;
  @tracked decisions = [];
  @tracked error;
  @tracked showModal = false;
  @tracked showCard = false;
  @tracked decision;
  @tracked legislationTypeUri;
  @tracked text;

  constructor() {
    super(...arguments);
    this.args.controller.onEvent(
      'contentChanged',
      this.onContentChange.bind(this)
    );
    this.args.controller.onEvent(
      'selectionChanged',
      this.onSelectionChanged.bind(this)
    );
    /*if (this.args.info?.words) {
      this.text = this.args.info.words.join(' ');
      this.legislationTypeUri = this.args.info.type?.uri;
      this.search.perform();
    }*/
  }

  onSelectionChanged() {
    const marks = this.controller.getMarksFor('citaten-plugin');
    const node =
      this.controller.selection.anchor &&
      this.controller.selection.anchor.parent;
    if (!node) return;
    let selectionMark;
    for (let mark of marks) {
      if (mark.name === 'citaten' && mark.node.parent === node) {
        selectionMark = mark;
        break;
      }
    }
    if (selectionMark) {
      this.showCard = true;
      this.text = selectionMark.attributes.text;
      this.legislationTypeUri = selectionMark.attributes.legislationTypeUri;
      this.search.perform();
    } else {
      this.showCard = false;
    }
  }

  get controller() {
    return this.args.controller;
  }

  onContentChange(event) {
    const selectedRange = this.controller.selection.lastRange;
    const rangeStore = this.controller.datastore.limitToRange(
      selectedRange,
      'rangeIsInside'
    );
    const besluitSubjectNodes = rangeStore
      .match(null, 'a', null)
      .transformDataset((dataset) => {
        return dataset.filter((quad) =>
          DECISION_TYPES.includes(quad.object.value)
        );
      })
      .asSubjectNodes()
      .next().value;
    const besluit = [...besluitSubjectNodes.nodes][0];
    if (besluit) {
      if (!event.payload.insertedNodes[0]) return;
      const insertedTextNode = event.payload.insertedNodes[0].parentNode;
      const text = insertedTextNode.boundNode.innerText;
      const result = matchRegex(text);
      if (result) {
        this.controller.executeCommand(
          'add-mark-to-range',
          this.controller.rangeFactory.fromInElement(insertedTextNode),
          'highlighted',
          {
            setBy: 'citaten-plugin',
          }
        );
        this.controller.executeCommand(
          'add-mark-to-range',
          this.controller.rangeFactory.fromInElement(insertedTextNode),
          'citaten',
          {
            setBy: 'citaten-plugin',
            text: result.text,
            legislationTypeUri: result.legislationTypeUri,
          }
        );
        this.showCard = true;
        this.text = result.text;
        this.legislationTypeUri = result.legislationTypeUri;
        this.search.perform();
      } else {
        this.showCard = false;
        this.controller.executeCommand(
          'remove-mark-from-range',
          this.controller.rangeFactory.fromInElement(insertedTextNode),
          'highlighted',
          { setBy: 'citaten-plugin' }
        );
      }
    }
  }

  get legislationTypes() {
    return LEGISLATION_TYPE_CONCEPTS;
  }

  @task({ restartable: true })
  *search() {
    this.error = null;
    try {
      // Split search string by grouping on non-whitespace characters
      // This probably needs to be more complex to search on group of words
      const words = (this.text || '').match(/\S+/g) || [];
      const filter = {
        type: this.legislationTypeUri,
      };
      const results = yield fetchDecisions(
        words,
        filter,
        this.pageNumber,
        this.pageSize
      );
      this.totalCount = results.totalCount;
      this.decisions = results.decisions;
    } catch (e) {
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

  @task({ restartable: true })
  *updateSearch() {
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
    this.hintsRegistry.removeHints({
      region: this.location,
      scope: EDITOR_CARD_NAME,
    });
    const citationHtml = `${
      type ? type : ''
    } <a class="annotation" href="${uri}" property="eli:cites" typeof="eli:LegalExpression">${title}</a>&nbsp;`;
    const range = this.editor.createModelRangeFromTextRegion(this.location);
    this.editor.executeCommand('insert-html', citationHtml, range);
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
    const type = this.legislationTypes.find(
      (type) => type.value === this.legislationTypeUri
    );
    if (type) return type.label;
    else return '';
  }
}
