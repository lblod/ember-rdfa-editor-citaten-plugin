import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { LEGISLATION_TYPES } from '../../utils/legislation-types';

export default class EditorPluginsCitaatInsertComponent extends Component {
  @tracked disableInsert = false;
  @tracked showModal = false;
  @tracked legislationTypeUri = LEGISLATION_TYPES.decreet;
  @tracked text = '';

  constructor() {
    super(...arguments);
    this.args.controller.onEvent(
      'selectionChanged',
      this.onSelectionChanged.bind(this)
    );
  }

  onSelectionChanged() {
    const selectedRange = this.args.controller.selection.lastRange;
    if (!selectedRange) {
      return;
    }
    const limitedDatastore = this.args.controller.datastore.limitToRange(
      selectedRange,
      'rangeIsInside'
    );
    const motivering = limitedDatastore
      .match(null, '>http://data.vlaanderen.be/ns/besluit#motivering')
      .asQuads()
      .next().value;
    this.disableInsert = motivering ? false : true;
  }

  @action
  openModal() {
    this.showModal = true;
  }

  @action
  closeModal() {
    this.showModal = false;
  }

  @action
  insertDecisionCitation(decision) {
    const type = decision.legislationType.label;
    const uri = decision.uri;
    const title = decision.title;
    const range = this.args.controller.selection.lastRange;
    const citationHtml = `${
      type ? type : ''
    } <a class="annotation" href="${uri}" property="eli:cites" typeof="eli:LegalExpression">${title}</a>&nbsp;`;
    this.args.controller.executeCommand('insert-html', citationHtml, range);
  }

  @action
  insertArticleCitation(decision, article) {
    const type = decision.legislationType.label;
    const uri = article.uri;
    const title = `${decision.title}, ${article.number}`;
    const range = this.args.controller.selection.lastRange;
    const citationHtml = `${
      type ? type : ''
    } <a class="annotation" href="${uri}" property="eli:cites" typeof="eli:LegalExpression">${title}</a>&nbsp;`;
    this.args.controller.executeCommand('insert-html', citationHtml, range);
  }
}
