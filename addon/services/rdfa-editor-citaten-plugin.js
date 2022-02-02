import EmberObject from '@ember/object';
import Service from '@ember/service';
import { isBlank } from '@ember/utils';
import { A } from '@ember/array';
import { LEGISLATION_TYPES } from '../utils/legislation-types';
const STOP_WORDS=['het', 'de', 'van', 'tot'];
const BASIC_MULTIPLANE_CHARACTER='\u0000-\u0019\u0021-\uFFFF'; // most of the characters used around the world
const CITATION_REGEX = new RegExp(`(gelet\\sop)?\\s?(het|de)?\\s?((decreet|omzendbrief|verdrag|grondwetswijziging|samenwerkingsakkoord|[a-z]*\\s?wetboek|protocol|besluit\\svan\\sde\\svlaamse\\sregering|geco[öo]rdineerde wetten|[a-z]*\\s?wet|[a-z]+\\s?besluit)(\\s+[\\s${BASIC_MULTIPLANE_CHARACTER}\\d;:'"()&-_]{3,}[${BASIC_MULTIPLANE_CHARACTER}\\d]+)|[a-z]+decreet|grondwet)`,'uig');
const DATE_REGEX = new RegExp('(\\d{1,2})\\s(\\w+)\\s(\\d{2,4})','g');
const DECISION_TYPES = [
      'http://data.vlaanderen.be/ns/mandaat#OntslagBesluit',
      'http://data.vlaanderen.be/ns/mandaat#AanstellingsBesluit',
      'http://data.vlaanderen.be/ns/besluit#Besluit'
];
const INVISIBLE_SPACE='\u200B';
const EDITOR_CARD_NAME = 'editor-plugins/citaat-card';

/**
* RDFa Editor plugin that hints references to existing Besluiten en Artikels.
*
* @module editor-citaten-plugin
* @class RdfaEditorCitatenPlugin
* @extends Ember.Service
*
*/
export default class RdfaEditorCitatenPlugin extends Service {
  editorApi = "0.1";

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
  execute(rdfaBlocks, hintsRegistry, editor) { //eslint-disable-line require-yield
    hintsRegistry.removeHints({rdfaBlocks, scope: EDITOR_CARD_NAME});

    const cards = A();
    for (let block of rdfaBlocks) {
      if (block.text) {
        if (this.hasApplicableContext(block)) {
          const matches = this.getMatches(block);
          for (const match of matches) {
            const card = this.createCardForMatch(match,hintsRegistry, editor);
            cards.pushObject(card);
          }
        }
      }
    }

    hintsRegistry.addHints(EDITOR_CARD_NAME, cards);
  }

  /**
   * Whether the given snippet is in the correct context to show a citation hint
   *
   * @method hasApplicableContext
   *
   * @param {RdfaBlock} snippet RdfaBlock to check for a hint
   * @return {boolean} Whether a citation hint should be shown on the given snippet
   *
   * @private
  */
  hasApplicableContext(snippet) {
    const triples = snippet.context;
    if (triples.find(t => t.predicate == 'a' && DECISION_TYPES.includes(t.object)) // in decision context
        && triples.some(s => s.predicate === 'http://data.vlaanderen.be/ns/besluit#motivering') // in motivation context
        && ! triples.some(s => s.predicate === 'http://data.europa.eu/eli/ontology#cites')) { // not in another eli:cites context
      const text = snippet.text ? snippet.text : '';
      return CITATION_REGEX.test(text);
    } else {
      return false;
    }
  }

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
  createCardForMatch(match, hintsRegistry, editor) {
    const words = match.words;
    const card = EmberObject.create({
      location: match.location,
      info: {
        match: match.text,
        words: words,
        type: match.type,
        location: match.location,
        hintsRegistry, editor
      },
      card: EDITOR_CARD_NAME
    });
    return card;
  }

  getMatches(rdfaBlock) {
    const matches = A();

    let quickMatch;
    CITATION_REGEX.lastIndex = 0;
    while ((quickMatch = CITATION_REGEX.exec(rdfaBlock.text)) !== null) {
      /*
       * match[0] = match 1 to end
       * match[1] = "gelet op"
       * match[2] = "het|de
       * match[3] = 4 + 5
       * match[4] = "decreet|beslissing|besluit|..."
       * match[5] = actual input
       */
      const input = quickMatch[5] ? quickMatch[5] : quickMatch[3];
      const cleanedInput = cleanupText(input);
      const words = cleanedInput.split(/[\s\u00A0]+/).filter(word => !isBlank(word) && word.length > 3 && !STOP_WORDS.includes(word));

      const articleIndex = quickMatch[3].indexOf('artikel');
      const matchingText = articleIndex >= 0 ? quickMatch[3].slice(0, articleIndex) : quickMatch[3];
      const matchStartIndex = rdfaBlock.region[0] + rdfaBlock.text.indexOf(matchingText);

      let typeLabel;
      let omitTypeLabel = false;
      if (quickMatch[4]) {
        typeLabel = quickMatch[4].toLowerCase();
      } else {
        if (matchingText.includes('grondwet')) {
          typeLabel = 'grondwet';
          omitTypeLabel = true;
        } else { // default to 'decreet' if no type can be determined
          typeLabel = 'decreet';
        }
      }
      const typeUri = LEGISLATION_TYPES[typeLabel];

      matches.pushObject({
        text: matchingText,
        location: [ matchStartIndex, matchStartIndex + matchingText.length ],
        type: {
          uri: typeUri,
          label: omitTypeLabel ? null : typeLabel
        },
        words
      });
    }
    return matches;
  }

}

function cleanupText(text) {
  const { textWithoutDates } = extractDates(text);
  const textWithoutOddChars = textWithoutDates.replace(new RegExp(`[,.:"()&${INVISIBLE_SPACE}]`,'g'),'');
  const articleIndex = textWithoutOddChars.indexOf('artikel');
  return articleIndex >= 0 ? textWithoutOddChars.slice(0, articleIndex) : textWithoutOddChars;
}

function extractDates(text) {
  let date;
  const matches = [];
  while ((date = DATE_REGEX.exec(text)) !== null) {
    matches.pushObject(date);
  }

  let textWithoutDates = text;
    for (let match of matches) {
      textWithoutDates = textWithoutDates.replace(match[0],'');
    }

  return { dates: matches, textWithoutDates };
}
