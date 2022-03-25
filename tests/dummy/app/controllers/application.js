import Controller from '@ember/controller';
import { action } from '@ember/object';

export default class ApplicationController extends Controller {
  plugins = ['citaten-plugin'];

  @action
  rdfaEditorInit(controller) {
    const presetContent = `
    <div property="prov:generated" resource="http://data.lblod.info/id/besluiten/baf2b3f5-2323-451c-8bd7-979632802034" typeof="besluit:Besluit https://data.vlaanderen.be/id/concept/BesluitType/67378dd0-5413-474b-8996-d992ef81637a ext:BesluitNieuweStijl" data-editor-position-level="2" data-editor-rdfa-position-level="1">
    <p data-editor-position-level="1">Openbare titel besluit:</p>
    <h4 class="h4" property="eli:title" datatype="xsd:string"><span class="mark-highlight-manual">Geef titel besluit op</span></h4>
    <span style="display:none;" property="eli:language" resource="http://publications.europa.eu/resource/authority/language/NLD" typeof="skos:Concept">&nbsp;</span>
    <p>Korte openbare beschrijving:</p>
    <p property="eli:description" datatype="xsd:string"><span class="mark-highlight-manual">Geef korte beschrijving op</span></p>
    <br>

    <div property="besluit:motivering" lang="nl">
      <p>
        <span class="mark-highlight-manual">geef bestuursorgaan op</span>,
      </p>
      <br>

      <h5>Bevoegdheid</h5>
       <ul class="bullet-list"><li><span class="mark-highlight-manual">Rechtsgrond die bepaalt dat dit orgaan bevoegd is.</span></li></ul>
       <br>

      <h5>Juridische context</h5>
      <ul class="bullet-list"><li><a href="https://codex.vlaanderen.be/doc/document/1009730" property="eli:cites" typeof="eli:LegalExpression">Nieuwe gemeentewet</a>&nbsp;(KB 24/06/1988)</li><li>decreet <a class="annotation" href="https://codex.vlaanderen.be/doc/document/1029017" property="eli:cites" typeof="eli:LegalExpression">over het lokaal bestuur</a> van 22/12/2017</li><li>wet <a class="annotation" href="https://codex.vlaanderen.be/doc/document/1009628" property="eli:cites" typeof="eli:LegalExpression">betreffende de politie over het wegverkeer (wegverkeerswet - Wet van 16 maart 1968)</a></li><li>wegcode - Koninklijk Besluit <a class="annotation" href="https://codex.vlaanderen.be/doc/document/1036242" property="eli:cites" typeof="eli:LegalExpression">van 1 december 1975 houdende algemeen reglement op de politie van het wegverkeer en van het gebruik van de openbare weg.</a></li><li>code van de wegbeheerder -&nbsp;<span data-editor-highlight="true" data-__set-by="rdfa-editor">ministerieel besluit van 11 oktober 1976 houdende de minimumafmetingen en de bijzondere plaatsingsvoorwaarden van de verkeerstekens</span></li></ul>
      <br>
      <em data-__set-by="rdfa-editor">specifiek voor aanvullende reglementen op het wegverkeer  (= politieverordeningen m.b.t. het wegverkeer voor wat betreft permanente of periodieke verkeerssituaties)</em>
      <ul class="bullet-list"><li>decreet <a class="annotation" href="https://codex.vlaanderen.be/doc/document/1016816" property="eli:cites" typeof="eli:LegalExpression">betreffende de aanvullende reglementen op het wegverkeer en de plaatsing en bekostiging van de verkeerstekens </a>(16 mei 2008)</li><li>Besluit van de Vlaamse Regering <a class="annotation" href="https://codex.vlaanderen.be/doc/document/1017729" property="eli:cites" typeof="eli:LegalExpression">betreffende de aanvullende reglementen en de plaatsing en bekostiging van verkeerstekens</a>&ZeroWidthSpace; van 23 januari 2009</li><li><a href="https://codex.vlaanderen.be/doc/document/1035938" property="eli:cites" typeof="eli:LegalExpression">Omzendbrief MOB/2009/01 van 3 april 2009 gemeentelijke aanvullende reglementen op de politie over het wegverkeer</a></li></ul>

      <h5>Feitelijke context en argumentatie</h5>
      <ul class="bullet-list"><li><span class="mark-highlight-manual">Voeg context en argumentatie in</span></li></ul>
    </div>
    <br>
    <br>

    <h5>Beslissing</h5>

    <div property="prov:value" datatype="xsd:string">
      <div property="eli:has_part" resource="http://data.lblod.info/artikels/bbeb89ae-998b-4339-8de4-c8ab3a0679b5" typeof="besluit:Artikel">
        <div>Artikel <span property="eli:number" datatype="xsd:string">1</span></div>
        <span style="display:none;" property="eli:language" resource="http://publications.europa.eu/resource/authority/language/NLD" typeof="skos:Concept">&nbsp;</span>
        <div property="prov:value" datatype="xsd:string">
          <span class="mark-highlight-manual">Voer inhoud in</span>
        </div>
      </div>
    </div>
   </div>`;
    controller.setHtmlContent(presetContent);
    const editorDone = new CustomEvent('editor-done');
    window.dispatchEvent(editorDone);
  }
}
