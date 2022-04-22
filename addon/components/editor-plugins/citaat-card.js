import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency-decorators';
import { timeout } from 'ember-concurrency';
import { action } from '@ember/object';
import { capitalize } from '@ember/string';
import processMatch from '../../utils/processMatch';
import { fetchDecisions } from '../../utils/vlaamse-codex';
import {
  LEGISLATION_TYPES,
  LEGISLATION_TYPE_CONCEPTS,
} from '../../utils/legislation-types';

const BASIC_MULTIPLANE_CHARACTER = '\u0021-\uFFFF'; // most of the characters used around the world

const NNWS = '[^\\S\\n]';
const CITATION_REGEX = new RegExp(
  `(gelet${NNWS}op)?${NNWS}?(het|de)?${NNWS}?((decreet|omzendbrief|verdrag|grondwetswijziging|samenwerkingsakkoord|[a-z]*${NNWS}?wetboek|protocol|besluit${NNWS}van${NNWS}de${NNWS}vlaamse${NNWS}regering|geco[öo]rdineerde wetten|[a-z]*${NNWS}?wet|[a-z]+${NNWS}?besluit)(${NNWS}+(${NNWS}|[${BASIC_MULTIPLANE_CHARACTER}\\d;:'"()&-_]){3,}[${BASIC_MULTIPLANE_CHARACTER}\\d]+)|[a-z]+decreet|grondwet)`,
  'uig'
);

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
  @tracked markSelected;
  liveHighlights;

  constructor() {
    console.log("In constructor for the citaat-card");
    super(...arguments);
    this.liveHighlights = this.args.controller.createLiveMarkSet({
      datastoreQuery: (datastore) => {
        const matches = datastore
          .match(null, '>http://data.vlaanderen.be/ns/besluit#motivering')
          .searchTextIn('predicate', CITATION_REGEX);
        const resultMatches = matches.filter((match) => {
          return (
            datastore
              .limitToRange(match.range, {
                type: 'rangeTouches',
                includeEndTags: true,
              })
              .match(null, '>http://data.europa.eu/eli/ontology#cites').size ===
            0
          );
        });
        resultMatches.forEach((match) => (match.range = match.groupRanges[3]));
        return resultMatches;
      },

      liveMarkSpecs: [
        {
          name: 'citaten',
          attributesBuilder: (textMatch) => {
            const result = processMatch(textMatch);

            return {
              setBy: 'citaten-plugin',
              text: result.text,
              legislationTypeUri: result.legislationTypeUri,
            };
          },
        },
        'highlighted',
      ],
    });
    this.controller.onEvent(
      'selectionChanged',
      this.onSelectionChanged.bind(this)
    );
  }

  onSelectionChanged() {
    const marks = this.controller.selection.lastRange.getMarks();
    let selectionMark;
    for (let mark of marks) {
      if (mark.name === 'citaten') {
        selectionMark = mark;
        break;
      }
    }
    if (selectionMark) {
      this.showCard = true;
      this.text = selectionMark.attributes.text;
      this.legislationTypeUri = selectionMark.attributes.legislationTypeUri;
      this.markSelected = selectionMark;
      console.log("onSelectionChanged in citaat-card");
      this.updateSearch.perform();
    } else {
      this.showCard = false;
    }
  }

  get controller() {
    return this.args.controller;
  }

  get legislationTypes() {
    return Object.keys(LEGISLATION_TYPES).map(capitalize);
  }

  get legislationSelected() {
    const found = LEGISLATION_TYPE_CONCEPTS.find(
      (c) => c.value === this.legislationTypeUri
    );
    return capitalize(found ? found.label : LEGISLATION_TYPE_CONCEPTS[0].label);
  }

  @task({ restartable: true })
  *updateSearch() {
    console.log("Update search in citaat-card");
    yield timeout(500);
    yield this.search.perform();
  }

  @task({ restartable: true })
  *search() {
    console.log("Search in citaat-card");
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
  selectLegislationType(type) {
    type = type.toLowerCase();
    const found = LEGISLATION_TYPE_CONCEPTS.find(
      (c) => c.label.toLowerCase() === type
    );
    this.legislationTypeUri = found
      ? found.value
      : LEGISLATION_TYPE_CONCEPTS[0].value;
    console.log("selectLegislationType in citaat-card");
    this.search.perform();
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
  insertDecisionCitation(decision) {
    const type = decision.legislationType.label;
    const uri = decision.uri;
    const title = decision.title;
    const range = this.controller.rangeFactory.fromAroundNode(
      this.markSelected.node
    );
    const citationHtml = `${
      type ? type : ''
    } <a class="annotation" href="${uri}" property="eli:cites" typeof="eli:LegalExpression">${title}</a>&nbsp;`;
    this.controller.executeCommand('insert-html', citationHtml, range);
  }

  @action
  insertArticleCitation(decision, article) {
    const type = decision.legislationType.label;
    const uri = article.uri;
    const title = `${decision.title}, ${article.number}`;
    const range = this.controller.rangeFactory.fromAroundNode(
      this.markSelected.node
    );
    const citationHtml = `${
      type ? type : ''
    } <a class="annotation" href="${uri}" property="eli:cites" typeof="eli:LegalExpression">${title}</a>&nbsp;`;
    this.controller.executeCommand('insert-html', citationHtml, range);
  }

  // Pagination

  //@action
  //prevPage() {
  //  this.pageNumber = this.pageNumber - 1;
  //  this.search.perform();
  //}

  //@action
  //nextPage() {
  //  this.pageNumber = this.pageNumber + 1;
  //  this.search.perform();
  //}

  willDestroy() {
    super.willDestroy();
    this.liveHighlights.destroy();
  }
}
