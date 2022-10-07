import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { LEGISLATION_TYPES } from '../../utils/legislation-types';
import { modifiesSelection } from '../../utils/step-checker';

export default class EditorPluginsCitaatInsertComponent extends Component {
  @tracked disableInsert = false;
  @tracked showModal = false;
  @tracked legislationTypeUri = LEGISLATION_TYPES.decreet;
  @tracked text = '';

  constructor() {
    super(...arguments);
    this.controller.addTransactionDispatchListener(this.onTransactionDispatch);
  }

  willDestroy() {
    this.controller.removeTransactionDispatchListener(
      this.onTransactionDispatch
    );
    super.willDestroy();
  }

  get controller() {
    return this.args.controller;
  }

  onTransactionDispatch = (transaction) => {
    if (
      modifiesSelection(transaction.steps) &&
      this.controller.selection.lastRange
    ) {
      const limitedDatastore = this.controller.datastore.limitToRange(
        this.controller.selection.lastRange,
        'rangeIsInside'
      );
      const motivering = limitedDatastore
        .match(null, '>http://data.vlaanderen.be/ns/besluit#motivering')
        .asQuads()
        .next().value;
      this.disableInsert = motivering ? false : true;
    }
  };

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
    const range = this.controller.selection.lastRange;
    const citationHtml = `${
      type ? type : ''
    } <a class="annotation" href="${uri}" property="eli:cites" typeof="eli:LegalExpression">${title}</a>&nbsp;`;
    this.controller.perform((tr) => {
      tr.commands.insertHtml({
        htmlString: citationHtml,
        range,
      });
    });
  }

  @action
  insertArticleCitation(decision, article) {
    const type = decision.legislationType.label;
    const uri = article.uri;
    const title = `${decision.title}, ${article.number}`;
    const range = this.controller.selection.lastRange;
    const citationHtml = `${
      type ? type : ''
    } <a class="annotation" href="${uri}" property="eli:cites" typeof="eli:LegalExpression">${title}</a>&nbsp;`;
    this.controller.perform((tr) => {
      tr.commands.insertHtml({
        htmlString: citationHtml,
        range,
      });
    });
  }
}
