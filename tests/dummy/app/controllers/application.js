import Controller from '@ember/controller';
import { action } from '@ember/object';

export default class ApplicationController extends Controller {
  plugins = ['citaten-plugin'];

  @action
  rdfaEditorInit(controller) {
    const presetContent = `
<div prefix="besluit: http://data.vlaanderen.be/ns/besluit#" typeof="besluit:Besluit">
  <span property="besluit:motivering">
     <text>decreet over het lokaal bestuur</text>
  </span>
</div>`;
    controller.setHtmlContent(presetContent);
    const editorDone = new CustomEvent('editor-done');
    window.dispatchEvent(editorDone);
  }
}
