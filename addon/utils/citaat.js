import EmberObject from '@ember/object';

/**
 * Citaat
 *
 * @module
 * @class Citaat
 * @constructor
 * @extends EmberObject
 */
export default EmberObject.extend({
  title: "",
  abstract: "",
  uri: "",
  origModel: null
});
