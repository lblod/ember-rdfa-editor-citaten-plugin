import Mixin from '@ember/object/mixin';
import attr from 'ember-data/attr';

export default Mixin.create({
  nummer: attr(),
  inhoud: attr(),
  taal: attr(),
  titel: attr(),
  uri: attr()
});
