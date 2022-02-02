import Controller from '@ember/controller';
import { action } from '@ember/object';

export default class ApplicationController extends Controller {
  plugins = ['rdfa-editor-citaten-plugin'];

  @action
  rdfaEditorInit(controller) {
    const presetContent = `<span resource="http://data.lblod.info/mappings/61DD4FF54402CC0009000002" typeof="ext:Mapping" data-editor-position-level="2" data-editor-rdfa-position-level="2">
    <span property="dct:type" content="date"></span>
    <span property="ext:content" datatype="xsd:date" data-editor-position-level="1" data-editor-rdfa-position-level="1">\${date}</span>
  </span>`;
    controller.setHtmlContent(presetContent);
    const editorDone = new CustomEvent('editor-done');
    window.dispatchEvent(editorDone);
  }
}
