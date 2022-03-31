import { LEGISLATION_TYPES } from './legislation-types';
import { isBlank } from '@ember/utils';

const STOP_WORDS = ['het', 'de', 'van', 'tot'];
const DATE_REGEX = new RegExp('(\\d{1,2})\\s(\\w+)\\s(\\d{2,4})', 'g');
const INVISIBLE_SPACE = '\u200B';

export default function processMatch(match) {
  const quickMatch = match.groups;
  if (!quickMatch) return false;
  const input = quickMatch[4] ? quickMatch[4] : quickMatch[2];
  const cleanedInput = cleanupText(input);
  const words = cleanedInput
    .split(/[\s\u00A0]+/)
    .filter(
      (word) => !isBlank(word) && word.length > 3 && !STOP_WORDS.includes(word)
    );

  const articleIndex = quickMatch[2].indexOf('artikel');
  const matchingText =
    articleIndex >= 0 ? quickMatch[2].slice(0, articleIndex) : quickMatch[2];
  let typeLabel;
  if (quickMatch[3]) {
    typeLabel = quickMatch[3].toLowerCase().trim();
  } else {
    if (matchingText.includes('grondwet')) {
      typeLabel = 'grondwet';
    } else {
      // default to 'decreet' if no type can be determined
      typeLabel = 'decreet';
    }
  }
  const typeUri = LEGISLATION_TYPES[typeLabel];
  return {
    text: words.join(' '),
    legislationTypeUri: typeUri,
    range: match.range,
  };
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
