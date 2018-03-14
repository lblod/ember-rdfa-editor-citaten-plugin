import Mixin from '@ember/object/mixin';
import attr from 'ember-data/attr';

export default Mixin.create({
  beschrijving: attr(),
  citeeropschrift: attr(),
  motivering: attr('language-string'),
  publicatiedatum: attr('date'),
  inhoud: attr(),
  taal: attr(),
  titel: attr(),
  score: attr(),
  uri: attr()
});
