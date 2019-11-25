import EmberObject from '@ember/object';
import Service, { inject as service } from '@ember/service';
import { isBlank } from '@ember/utils';
import '../models/custom-inflector-rules';
import { task } from 'ember-concurrency';
import { A } from '@ember/array';
const STOP_WORDS=['het', 'de', 'van', 'tot'];
const regex = new RegExp('(gelet\\sop)?\\s?(het|de)?\\s?((decreet|beslissing|[a-z]*\\s?besluit|[a-z]*\\s?besluit)([\\s\\w\\dd;:\'"()&-_]{3,})[\\w\\d]+|[a-z]+decreet)','ig');

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

  hasApplicableContext(snippet) {
    const triples = snippet.context;
    const besluit = triples.find(t => t.predicate == 'a' &&  this.get('besluitClasses').includes(t.object));
    if (besluit && triples.any((s) => s.predicate === 'http://data.vlaanderen.be/ns/besluit#motivering') && ! triples.any((s) => s.predicate === 'http://data.europa.eu/eli/ontology#cites')) {
      const text = snippet.text ? snippet.text : "";
      return regex.test(text);
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
  execute: task(function * (hrId, blocks, hintsRegistry, editor) { //eslint-disable-line require-yield
    for (let block of blocks) {
      const cards = A();
      if (block.text) {
        if (this.hasApplicableContext(block)) {
          const matchList = this.extractData(block);
          for (const data of matchList) {
            cards.pushObject(this.createCardForMatch(data, hrId, hintsRegistry, editor));
          }
        }
        hintsRegistry.removeHintsInRegion(block.region, hrId, this.who);
        hintsRegistry.addHints(hrId, this.who, cards);
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

  extractData(snippet) {
    const matches = A();
    var quickMatch;
    regex.lastIndex = 0;
    while ((quickMatch = regex.exec(snippet.text)) !== null) {
      /*
       * match[0] = match 1 to end
       * match[1] = "gelet op"
       * match[2] = "het|de
       * match[3] = 4 +5
       * match[4] = "decreet|beslissing|besluit"
       * match[5] = actual input
       */
      const searchText = quickMatch[5] ? quickMatch[5] : quickMatch[3];
      const artikelIndex = quickMatch[3].indexOf("artikel");
      const text = artikelIndex >= 0 ? quickMatch[3].slice(0, artikelIndex) : quickMatch[3];
      const updatedText = this.cleanupText(searchText);
      const words = updatedText.split(/[\s\u00A0]+/).filter( word => ! isBlank(word) && word.length > 3 &&  ! STOP_WORDS.includes(word));
      const index = snippet.text.indexOf(text);
      const match = { text, position: snippet.region[0] + index };
      matches.pushObject({match, words, realMatch: quickMatch});
    }
    return matches;
  },
  cleanupText(text) {
    const { updatedText }=this.extractDates(text);
    const textWithoutOddChars=updatedText.replace(/[,.:"()&]/g,'');
    const indexOfArtikel=textWithoutOddChars.indexOf("artikel");
    return indexOfArtikel >= 0 ? textWithoutOddChars.slice(0, indexOfArtikel) : textWithoutOddChars;
  },
  extractDates(text) {
    var date;
    const dateRegex = new RegExp('(\\d{1,2})\\s(\\w+)\\s(\\d{2,4})','g');
    const matches=[];
    while ((date = dateRegex.exec(text)) !== null) {
      matches.pushObject(date);
    }
    var updatedText = text;
    for (let match of matches) {
      updatedText = updatedText.replace(match[0],'');
    }
    return {dates: matches, updatedText };
  }
});
