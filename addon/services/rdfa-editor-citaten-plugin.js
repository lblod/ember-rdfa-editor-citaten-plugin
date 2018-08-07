import EmberObject from '@ember/object';
import { Promise } from 'rsvp';
import Service, { inject as service } from '@ember/service';
import { isEmpty, isBlank } from '@ember/utils';
import '../models/custom-inflector-rules';
import { task, timeout } from 'ember-concurrency';

const STOP_WORDS=['het', 'de'];
const DEBOUNCE_MS=250;

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
   * @property hints
   * @type Array
   *
   * @private
  */
  hints: null,

  /**
   * @property besluitClasses
   * @type Array
   *
   * @private
   */
  besluitClasses: null,

  init() {
    this._super(...arguments);
    this.set('hints', []);
    this.set('besluitClasses', [
      'http://data.vlaanderen.be/ns/mandaat#OntslagBesluit',
      'http://data.vlaanderen.be/ns/mandaat#AanstellingsBesluit',
      'http://data.vlaanderen.be/ns/besluit#Besluit'
    ]);
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
    this.removeAllHints(hintsRegistry);
    if (contexts.length === 0) return;
    const hints = [];
    const generateHintsForContextAsync = async (context) => {
      const hintsForContext = await this.generateHintsForContext(context, hrId, hintsRegistry, editor);
      hints.push(...hintsForContext);
    };
    yield timeout(DEBOUNCE_MS);
    yield Promise.all(contexts.filter(c => this.contextIsApplicable(c)).map(context => generateHintsForContextAsync(context)));
    this.set('hints', hints); // todo: use these hints to update cards instead of destroying and recreating
   if (hints.length > 0) {
      hintsRegistry.addHints(hrId, this.get('who'), hints);
   }

  }).restartable(),

  removeAllHints(registry) {
    this.get('hints').forEach( (hint) => registry.removeHintsAtLocation(hint.get('location'), hint.get('info.hrId'), 'editor-plugins/citaat-card'));
  },
  /**
   * Generates the hints for a location based on a given RDFa context and text input.
   * A hint includes a suggestion for a standard template to insert in the editor.
   *
   * @method generateHintsForContext
   *
   * @param {Object} snippet Text snippet at a specific location with an RDFa context
   * @param {string} hrId Unique identifier of the event in the hintsRegistry
   * @param {Object} hintsRegistry Registry of hints in the editor
   * @param {Object} editor The RDFa editor instance
   *
   * @return {Array} Array of cards to hint for a given context
   *
   * @private
   */
  async generateHintsForContext(snippet, hrId, hintsRegistry, editor) {
    const hints = [];
    let matches = this.scanForMatch(snippet.text);
    matches.forEach(match => {
      let words = this.extractWords(match.text);
      if (! isEmpty(words)) {
        match.position = snippet.region[0] + match.position;
        hints.push(this.createCardForMatch(match, words, hrId, hintsRegistry, editor));
      }
    });
    return hints;
  },

  extractWords(text) {

    return text.split(/[\s\u00A0]+/).filter( word => ! isBlank(word) && word.length > 3 &&  ! STOP_WORDS.includes(word));
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
  createCardForMatch(match, words, hrId, hintsRegistry, editor) {
    let location = [match.position, match.position + match.text.length];
    const card = EmberObject.create({
      location: location,
      info: {
        match: match.text,
        words: words,
        location, hrId, hintsRegistry, editor
      },
      card: this.get('who')
    });
    return card;
  },


  /**
   * Validates if a context is of interest for the plugin
   *
   * @method contextIsApplicable
   *
   * @param {Object} snippet Text snippet with an RDFa context
   *
   * @private
   */
  contextIsApplicable(snippet) {
    const besluiten = snippet.context.filter(t => t.predicate == 'a' &&  this.get('besluitClasses').includes(t.object));
    if (besluiten.length > 0) {
      const subj = besluiten[0].subject;
      // we don't have to check if this is already cited, because in that case "gelet op" and the cited source will have different contexts
      return snippet.context.filter(s => s.subject == subj && s.predicate == 'http://data.vlaanderen.be/ns/besluit#motivering').length > 0;
    }
    return false;
  },

  /**
   * Scan a text snippet to find possible citations
   *
   * @method scanForMatch
   *
   * @param {string} text Text snippet to scan
   *
   * @return {Array} Array containing objects with the part of the text that matches
   *                together with its relative position in the text.
   *
   * @private
   */
  scanForMatch(text) {
    // this regex matches any text after "gelet op" until a newline is found
    // the regex has the following flags:
    //   i: case insensitive
    //   g: global (return all matches)
    let regex = new RegExp('(gelet\\sop\\s)([a-z0-9\\s]{3,})','ig');
    let matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      let obj = {};
      obj.text = match[2];
      if (obj.text.trim().length > 0) {
        obj.position = match.index + match[1].length;
        matches.push(obj);
      }
    }
    return matches;
  }
});
