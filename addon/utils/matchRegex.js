import { LEGISLATION_TYPES } from './legislation-types';
import { isBlank } from '@ember/utils';

const STOP_WORDS = ['het', 'de', 'van', 'tot'];

const BASIC_MULTIPLANE_CHARACTER = '\u0000-\u0019\u0021-\uFFFF'; // most of the characters used around the world
const CITATION_REGEX = new RegExp(
  `(gelet\\sop)?\\s?(het|de)?\\s?((decreet|omzendbrief|verdrag|grondwetswijziging|samenwerkingsakkoord|[a-z]*\\s?wetboek|protocol|besluit\\svan\\sde\\svlaamse\\sregering|geco[öo]rdineerde wetten|[a-z]*\\s?wet|[a-z]+\\s?besluit)(\\s+[\\s${BASIC_MULTIPLANE_CHARACTER}\\d;:'"()&-_]{3,}[${BASIC_MULTIPLANE_CHARACTER}\\d]+)|[a-z]+decreet|grondwet)`,
  'uig'
);
const DATE_REGEX = new RegExp('(\\d{1,2})\\s(\\w+)\\s(\\d{2,4})', 'g');
const INVISIBLE_SPACE = '\u200B';

export default function matchRegex(text) {
  const quickMatch = CITATION_REGEX.exec(text);
  if (!quickMatch) return false;
  const input = quickMatch[5] ? quickMatch[5] : quickMatch[3];
  const cleanedInput = cleanupText(input);
  const words = cleanedInput
    .split(/[\s\u00A0]+/)
    .filter(
      (word) => !isBlank(word) && word.length > 3 && !STOP_WORDS.includes(word)
    );

  const articleIndex = quickMatch[3].indexOf('artikel');
  const matchingText =
    articleIndex >= 0 ? quickMatch[3].slice(0, articleIndex) : quickMatch[3];
  let typeLabel;
  if (quickMatch[4]) {
    typeLabel = quickMatch[4].toLowerCase();
  } else {
    if (matchingText.includes('grondwet')) {
      typeLabel = 'grondwet';
    } else {
      // default to 'decreet' if no type can be determined
      typeLabel = 'decreet';
    }
  }
  const typeUri = LEGISLATION_TYPES[typeLabel];
  return { text: words.join(' '), legislationTypeUri: typeUri };
}

function cleanupText(text) {
  const { textWithoutDates } = extractDates(text);
  const textWithoutOddChars = textWithoutDates.replace(
    new RegExp(`[,.:"()&${INVISIBLE_SPACE}]`, 'g'),
    ''
  );
  const articleIndex = textWithoutOddChars.indexOf('artikel');
  return articleIndex >= 0
    ? textWithoutOddChars.slice(0, articleIndex)
    : textWithoutOddChars;
}

function extractDates(text) {
  let date;
  const matches = [];
  while ((date = DATE_REGEX.exec(text)) !== null) {
    matches.push(date);
  }

  let textWithoutDates = text;
  for (let match of matches) {
    textWithoutDates = textWithoutDates.replace(match[0], '');
  }

  return { dates: matches, textWithoutDates };
}
