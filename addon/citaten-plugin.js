import CitatenMark from '@lblod/ember-rdfa-editor-citaten-plugin/marks/citaten-mark';
export default class CitatenPlugin {
  controller;

  get name() {
    return 'citaten-plugin';
  }
  async initialize(controller) {
    this.controller = controller;
    controller.registerWidget({
      desiredLocation: 'sidebar',
      componentName: 'editor-plugins/citaat-card',
      identifier: 'editor-plugins/citaat-card',
    });
    controller.registerWidget({
      desiredLocation: 'insertSidebar',
      componentName: 'editor-plugins/citaat-insert',
      identifier: 'editor-plugins/citaat-insert',
    });
    controller.registerMark(CitatenMark);
  }
}
