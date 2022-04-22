import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { task, timeout } from 'ember-concurrency';
import { inject as service } from '@ember/service';
import { capitalize } from '@ember/string';
import { useTask } from 'ember-resources';
import {
  LEGISLATION_TYPES,
  LEGISLATION_TYPE_CONCEPTS,
} from '../../../utils/legislation-types';
import { fetchDecisions } from '../../../utils/vlaamse-codex';

function getISODate(date) {
  if (date) {
    // Flatpickr captures the date in local time. Hence date.toISOString() may return the day before the selected date
    // E.g. selected date 2020-04-15 00:00:00 GMT+0200 will become 2020-04-14 22:00:00 UTC
    // We will pretend the selected date is UTC because that's what's meant as date for filtering
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  } else {
    return null;
  }
}

export default class EditorPluginsCitationsSearchModalComponent extends Component {
  @service intl;
  @tracked text;
  @tracked textAfterTimeout;
  // Vlaamse Codex currently doesn't contain captions and content of decisions
  // @tracked isEnabledSearchCaption = false
  // @tracked isEnabledSearchContent = false
  @tracked legislationTypeUri;
  @tracked pageNumber = 0;
  @tracked pageSize = 5;
  @tracked totalCount;
  @tracked decisions = [];
  @tracked error;
  @tracked selectedDecision;
  @tracked documentDateFrom = null;
  @tracked documentDateTo = null;
  @tracked publicationDateFrom = null;
  @tracked publicationDateTo = null;

  get datePickerLocalization() {
    return {
      buttonLabel: this.intl.t('auDatePicker.buttonLabel'),
      selectedDateMessage: this.intl.t('auDatePicker.selectedDateMessage'),
      prevMonthLabel: this.intl.t('auDatePicker.prevMonthLabel'),
      nextMonthLabel: this.intl.t('auDatePicker.nextMonthLabel'),
      monthSelectLabel: this.intl.t('auDatePicker.monthSelectLabel'),
      yearSelectLabel: this.intl.t('auDatePicker.yearSelectLabel'),
      closeLabel: this.intl.t('auDatePicker.closeLabel'),
      keyboardInstruction: this.intl.t('auDatePicker.keyboardInstruction'),
      calendarHeading: this.intl.t('auDatePicker.calendarHeading'),
      dayNames: getLocalizedDays(this.intl),
      monthNames: getLocalizedMonths(this.intl),
      monthNamesShort: getLocalizedMonths(this.intl, 'short'),
    };
  }

  constructor() {
    super(...arguments);
    this.selectedDecision = this.args.selectedDecision;
    this.legislationTypeUri =
      this.args.legislationTypeUri || LEGISLATION_TYPES['decreet'];
    this.text = this.args.text;
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

  decisionResource = useTask(this, this.resourceSearch, () => [
    this.textAfterTimeout,
    this.legislationTypeUri,
    this.pageSize,
    this.pageNumber,
    this.documentDateFrom,
    this.documentDateTo,
    this.publicationDateFrom,
    this.publicationDateTo,
  ]);

  @task({ restartable: true })
  *resourceSearch() {
    this.error = null;
    yield undefined; //To prevent retriggering because of the use of this.text later.
    try {
      // Split search string by grouping on non-whitespace characters
      // This probably needs to be more complex to search on group of words
      const words = (this.textAfterTimeout || this.text || '').match(/\S+/g) || [];
      const filter = {
        type: this.legislationTypeUri,
        documentDateFrom: getISODate(this.documentDateFrom),
        documentDateTo: getISODate(this.documentDateTo),
        publicationDateFrom: getISODate(this.publicationDateFrom),
        publicationDateTo: getISODate(this.publicationDateTo),
      };
      const results = yield fetchDecisions(
        words,
        filter,
        this.pageNumber,
        this.pageSize
      );
      this.totalCount = results.totalCount;
      return results.decisions;
    } catch (e) {
      console.warn(e); // eslint-ignore-line no-console
      this.totalCount = 0;
      this.error = e;
      return [];
    }
  }

  @task({ restartable: true })
  *updateSearch() {
    yield timeout(500);
    this.textAfterTimeout = this.text;
    this.pageNumber = 0;
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
  }

  @action
  updateDocumentDateFrom(isoDate, date) {
    this.documentDateFrom = date;
  }

  @action
  updateDocumentDateTo(isoDate, date) {
    this.documentDateTo = date;
  }

  @action
  updatePublicationDateFrom(isoDate, date) {
    this.publicationDateFrom = date;
  }

  @action
  updatePublicationDateTo(isoDate, date) {
    this.publicationDateTo = date;
  }

  @action
  insertDecisionCitation(decision) {
    this.args.insertDecisionCitation(decision);
    this.args.closeModal();
  }

  @action
  insertArticleCitation(decision, article) {
    this.args.insertArticleCitation(decision, article);
    this.args.closeModal();
  }

  @action
  closeDecisionDetail() {
    this.selectedDecision = null;
  }

  @action
  openDecisionDetail(decision) {
    this.selectedDecision = decision;
  }

  // Pagination

  @action
  previousPage() {
    --this.pageNumber;
  }

  @action
  nextPage() {
    ++this.pageNumber;
  }

  get rangeStart() {
    return this.pageNumber * this.pageSize + 1;
  }

  get rangeEnd() {
    const end = this.rangeStart + this.pageSize - 1;
    return end > this.totalCount ? this.totalCount : end;
  }

  get isFirstPage() {
    return this.pageNumber == 0;
  }

  get isLastPage() {
    return this.rangeEnd == this.totalCount;
  }
}

function getLocalizedMonths(intl, monthFormat = 'long') {
  let someYear = 2021;
  return [...Array(12).keys()].map((monthIndex) => {
    let date = new Date(someYear, monthIndex);
    return intl.formatDate(date, { month: monthFormat });
  });
}

function getLocalizedDays(intl, weekdayFormat = 'long') {
  let someSunday = new Date('2021-01-03');
  return [...Array(7).keys()].map((index) => {
    let weekday = new Date(someSunday.getTime());
    weekday.setDate(someSunday.getDate() + index);
    return intl.formatDate(weekday, { weekday: weekdayFormat });
  });
}
