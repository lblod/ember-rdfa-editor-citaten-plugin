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
  }
}
