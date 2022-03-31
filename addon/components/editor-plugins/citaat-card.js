import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency-decorators';
import { timeout } from 'ember-concurrency';
import { action } from '@ember/object';
import processMatch from '../../utils/processMatch';
import { fetchDecisions } from '../../utils/vlaamse-codex';
import { LEGISLATION_TYPE_CONCEPTS } from '../../utils/legislation-types';

const BASIC_MULTIPLANE_CHARACTER = '\u0021-\uFFFF'; // most of the characters used around the world

const NNWS = '[^\\S\\n]';
const CITATION_REGEX = new RegExp(
  `(gelet${NNWS}op)?${NNWS}?(het|de)?${NNWS}?((decreet|omzendbrief|verdrag|grondwetswijziging|samenwerkingsakkoord|[a-z]*${NNWS}?wetboek|protocol|besluit${NNWS}van${NNWS}de${NNWS}vlaamse${NNWS}regering|geco[öo]rdineerde wetten|[a-z]*${NNWS}?wet|[a-z]+${NNWS}?besluit)(${NNWS}+(${NNWS}|[${BASIC_MULTIPLANE_CHARACTER}\\d;:'"()&-_]){3,}[${BASIC_MULTIPLANE_CHARACTER}\\d]+)|[a-z]+decreet|grondwet)`,
  'uig'
);

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
      this.search.perform();
    } else {
      this.showCard = false;
    }
  }

  get controller() {
    return this.args.controller;
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
    const range = this.controller.rangeFactory.fromAroundNode(
      this.markSelected.node
    );
    const citationHtml = `${
      type ? type : ''
    } <a class="annotation" href="${uri}" property="eli:cites" typeof="eli:LegalExpression">${title}</a>&nbsp;`;
    this.controller.executeCommand('insert-html', citationHtml, range);
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

  get legislationType() {
    const type = this.legislationTypes.find(
      (type) => type.value === this.legislationTypeUri
    );
    if (type) return type.label;
    else return '';
  }

  willDestroy() {
    super.willDestroy();
    this.liveHighlights.destroy();
  }
}
