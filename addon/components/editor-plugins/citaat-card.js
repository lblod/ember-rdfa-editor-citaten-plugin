import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency-decorators';
import { timeout } from 'ember-concurrency';
import { action } from '@ember/object';
import { capitalize } from '@ember/string';
import processMatch from '../../utils/processMatch';
import { fetchDecisions, cleanCaches } from '../../utils/vlaamse-codex';
import {
  LEGISLATION_TYPES,
  LEGISLATION_TYPE_CONCEPTS,
} from '../../utils/legislation-types';
import { task as trackedTask } from 'ember-resources/util/ember-concurrency';

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
  @tracked legislationTypeUriAfterTimeout;
  @tracked text;
  @tracked textAfterTimeout;
  @tracked markSelected;
  liveHighlights;

  constructor() {
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
      if (this.showCard) {
        //Card was already shown, update search condition and trigger search debounced
        this.text = selectionMark.attributes.text;
        this.legislationTypeUri = selectionMark.attributes.legislationTypeUri;
        this.markSelected = selectionMark;
        this.updateSearch.perform();
      } else {
        //When card is renderend first time, the resource will automatically trigger, no updateSearch is needed, but make sure to first set the search conditions, before showing the card.
        //When not first time, but reopened, search terms could not have changed yet, so also no updateSearch needed
        this.text = selectionMark.attributes.text;
        this.legislationTypeUri = selectionMark.attributes.legislationTypeUri;
        if (
          this.legislationTypeUriAfterTimeout &&
          (this.legislationTypeUri !== this.legislationTypeUriAfterTimeout ||
            this.text !== this.textAfterTimeout)
        ) {
          //Convoluted, but this is when you switch from one reference insertion to another
          this.updateSearchImmediate.perform();
        }
        this.markSelected = selectionMark;
        this.showCard = true;
      }
    } else {
      this.showCard = false;
      //Would be nice, but this triggers way to often causing the cancellation of useful requests
      //this.decisionResource.cancel();
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

  decisionResource = trackedTask(this, this.resourceSearch, () => [
    this.textAfterTimeout,
    this.legislationTypeUriAfterTimeout,
    this.pageNumber,
    this.pageSize,
  ]);

  @task({ restartable: true })
  *updateSearch() {
    yield timeout(500);
    this.textAfterTimeout = this.text;
    this.legislationTypeUriAfterTimeout = this.legislationTypeUri;
  }

  @task({ restartable: true })
  *updateSearchImmediate() {
    this.textAfterTimeout = this.text;
    this.legislationTypeUriAfterTimeout = this.legislationTypeUri;
    yield;
  }

  @task({ restartable: true })
  *resourceSearch() {
    this.error = null;
    yield undefined; //To prevent other variables used below (this.text and this.legislationTypeUri) to trigger a retrigger.
    const abortController = new AbortController();
    const signal = abortController.signal;
    try {
      // Split search string by grouping on non-whitespace characters
      // This probably needs to be more complex to search on group of words
      const words =
        (this.textAfterTimeout || this.text || '').match(/\S+/g) || [];
      const filter = {
        type: this.legislationTypeUriAfterTimeout || this.legislationTypeUri,
      };
      const results = yield fetchDecisions(
        words,
        filter,
        this.pageNumber,
        this.pageSize,
        signal
      );
      this.totalCount = results.totalCount;
      return results.decisions;
    } catch (e) {
      console.warn(e); // eslint-ignore-line no-console
      this.totalCount = 0;
      this.error = e;
      return [];
    } finally {
      //Abort all requests now that this task has either successfully finished or has been cancelled
      abortController.abort();
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
    this.legislationTypeUriAfterTimeout = this.legislationTypeUri;
  }

  @action
  openDecisionDetailModal(decision) {
    this.decision = decision;
    this.showModal = true;
  }

  @action
  openSearchModal() {
    this.decisionResource.cancel();
    this.decision = null;
    this.showModal = true;
  }

  @action
  closeModal(lastSearchType, lastSearchTerm) {
    this.showModal = false;
    this.decision = null;
    if (lastSearchType) this.legislationTypeUri = lastSearchType;
    if (lastSearchTerm) this.text = lastSearchTerm;
    if (lastSearchType || lastSearchTerm) this.updateSearchImmediate.perform();
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

  async willDestroy() {
    // Not necessary as ember-concurrency does this for us.
    // this.decisionResource.cancel();
    cleanCaches();
    this.liveHighlights.destroy();
    super.willDestroy();
  }
}
