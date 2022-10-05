import CitatenMark from '@lblod/ember-rdfa-editor-citaten-plugin/marks/citaten-mark';
export default class CitatenPlugin {
  get name() {
    return '@lblod/ember-rdfa-editor/core/model/editor-plugin';
  }
  async initialize(transaction, controller) {
    transaction.registerWidget(
      {
        desiredLocation: 'sidebar',
        componentName: 'editor-plugins/citaat-card',
        identifier: 'editor-plugins/citaat-card',
      },
      controller
    );
    transaction.registerWidget(
      {
        desiredLocation: 'insertSidebar',
        componentName: 'editor-plugins/citaat-insert',
        identifier: 'editor-plugins/citaat-insert',
      },
      controller
    );
    transaction.registerMark(CitatenMark);
  }
}
