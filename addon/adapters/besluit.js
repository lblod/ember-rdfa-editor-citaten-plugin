import DS from 'ember-data';
import { isBlank, typeOf } from '@ember/utils';
export default DS.JSONAPIAdapter.extend({
  /**
   Called by the store in order to fetch a JSON array for
   the records that match a particular query.
   The `query` method makes an Ajax (HTTP GET) request to a URL
   computed by `buildURL`, and returns a promise for the resulting
   payload.
   The `query` argument is a simple JavaScript object that will be passed directly
   to the server as parameters.
   @method query
   @param {DS.Store} store
   @param {DS.Model} type
   @param {Object} query
   @return {Promise} promise
   */
  query(store, type, query) {
    let url = this.buildURL(type.modelName, null, null, 'query', query);
    if (this.sortQueryParams) {
      query = this.sortQueryParams(query);
    }
    var serializedQuery = this._serializeObjectToQueryParam(query).join('&');
    return this.ajax(url, 'GET', { data: serializedQuery, processData: false });
  },

  _serializeObjectToQueryParam(obj, prefix = []) {
    var serializedQuery = [];
    for (var key of Object.keys(obj)) {
      var value = obj[key];
      var realKey = isBlank(prefix)  ? key : `${prefix}[${key}]`;
      if (typeOf(value) === 'string' || typeOf(value) ===  'number')
        serializedQuery.pushObject(this._encodeKeyValue(realKey, value));
      else if (typeOf(value) === 'array')
        value.forEach(param => serializedQuery.pushObject(this._encodeKeyValue(realKey, param)));
      else if (typeOf(value) === 'object')
        serializedQuery.pushObjects(this._serializeObjectToQueryParam(value, realKey));
      else
        serializedQuery.pushObject(this._encodeKeyValue(realKey, value.toString()));
    }
    return serializedQuery;
  },

  _encodeKeyValue(key, value) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(value);
  }
});
