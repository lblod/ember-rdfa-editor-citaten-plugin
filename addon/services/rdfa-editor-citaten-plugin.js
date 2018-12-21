import EmberObject from '@ember/object';
import Service, { inject as service } from '@ember/service';
import { isBlank } from '@ember/utils';
import '../models/custom-inflector-rules';
import { task } from 'ember-concurrency';
import { A } from '@ember/array';

const STOP_WORDS=['het', 'de'];
const regex = new RegExp('((gelet\\sop)\\s(het\\sdecreet|de\\sbeslissing)?|(het\\sdecreet|de\\sbeslissing))\\s([a-z0-9\\s]{3,})','ig');
const matchRegex = new RegExp('((gelet\\sop)\\s+(het\\sdecreet|de\\sbeslissing)?|(het\\sdecreet|de\\sbeslissing))\\s(van\\s*(de gemeenteraad)).*\\stot\\s([a-z0-9\\s]{3,})','ig');

/**
* RDFa Editor plugin that hints references to existing Besluiten en Artikels.
*
* @module editor-citaten-plugin
* @class RdfaEditorCitatenPlugin
* @extends Ember.Service
*
*/
export default Service.extend({
  store: service(),

  /**
   * @property who
   * @type string
   * @default 'editor-plugins/citaat-card'
   *
   * @private
  */
  who: 'editor-plugins/citaat-card',

  /**
   * @property besluitClasses
   * @type Array
   *
   * @private
   */
  besluitClasses: null,

  init() {
    this._super(...arguments);
    this.set('besluitClasses', [
      'http://data.vlaanderen.be/ns/mandaat#OntslagBesluit',
      'http://data.vlaanderen.be/ns/mandaat#AanstellingsBesluit',
      'http://data.vlaanderen.be/ns/besluit#Besluit'
    ]);
  },

  async hasApplicableContext(snippet) {
    const triples = snippet.context;
    const besluit = triples.find(t => t.predicate == 'a' &&  this.get('besluitClasses').includes(t.object));
    if (besluit && triples.any((s) => /*s.subject === besluit.subject &&*/ s.predicate === 'http://data.vlaanderen.be/ns/besluit#motivering') && ! triples.any((s) => s.predicate === 'http://data.europa.eu/eli/ontology#cites')) {
      return regex.test(snippet.text);
    }
  return false;
  },
  /**
   * Restartable task to handle the incoming events from the editor dispatcher
   *
   * @method execute
   *
   * @param {string} hrId Unique identifier of the event in the hintsRegistry
   * @param {Array} contexts RDFa contexts of the text snippets the event applies on
   * @param {Object} hintsRegistry Registry of hints in the editor
   * @param {Object} editor The RDFa editor instance
   *
   * @public
   */
  execute: task(function * (hrId, contexts, hintsRegistry, editor) {
    const hints = A();
    for (var snippet of contexts) {
      hintsRegistry.removeHintsInRegion(snippet.region, hrId, this.who);
      if (yield this.hasApplicableContext(snippet)) {
        const matchList = yield this.extractData(snippet);
        for (const data of matchList) {
          hintsRegistry.removeHintsInRegion(snippet.region, hrId, this.who);
          hintsRegistry.addHints(hrId, this.get('who'), [this.createCardForMatch(data, hrId, hintsRegistry, editor)]);
        }
      }
    }
  }),

  fetchResources(words, page = 0) {
    let filter = {
      page: { number: page, size: 5 },
      sort: '-score',
      'filter[titel]':  words
    };
    return this.store.query('besluit', filter);
  },
  /**
   * Creates a hint for a match
   *
   * @method createCardForMatch
   *
   * @param {Object} match a match with a text position
   * @param {string} hrId Unique identifier of the event in the hintsRegistry
   * @param {Array} words to search citations for
   * @param {Object} hintsRegistry Registry of hints in the editor
   * @param {Object} editor The RDFa editor instance
   *
   * @return {Object} a hint
   *
   * @private
   */
  createCardForMatch(data, hrId, hintsRegistry, editor) {
    const match = data.match;
    const words = data.words;
    let location = [match.position, match.position + match.text.length];
    const query = this.fetchResources(words);
    const card = EmberObject.create({
      location,
      info: {
        match: match.text,
        fetchPage: (page = 1) => this.fetchResources(words, page),
        query, location, hrId, hintsRegistry, editor
      },
      card: this.get('who')
    });
    return card;
  },

  async extractData(snippet) {
    const matches = A();
    var quickMatch;
    while ((quickMatch = matchRegex.exec(snippet.text)) !== null) {
      if (!quickMatch || !quickMatch[7])
        return null;
      const text = quickMatch[7];
      const words = text.split(/[\s\u00A0]+/).filter( word => ! isBlank(word) && word.length > 3 &&  ! STOP_WORDS.includes(word));
      const match = {text: ''};
      match.text = `${quickMatch[3] ? quickMatch[3] : quickMatch[1]}`;
      if (quickMatch[5])
        match.text = match.text + ' ' + quickMatch[5];
      match.text = match.text + ' tot ';
      match.text = match.text + quickMatch[7];
      match.position = snippet.region[0] + quickMatch.index;
      if (quickMatch[2])
        match.position = match.position + quickMatch[2].length + 1;
      matches.pushObject({match, words, realMatch: quickMatch});
    }
    return matches;
  }
});
