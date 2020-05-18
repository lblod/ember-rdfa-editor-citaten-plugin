import { equal } from '@ember/object/computed';
import { assert } from '@ember/debug';
import { computed } from '@ember/object';
import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/citaat-card-pagination';

export default Component.extend({
  layout,
  pageNumber: 0,
  pageSize: 5,
  total: undefined,
  prev: undefined,
  next: undefined,
  rangeStart: computed('pageNumber', 'pageSize', function () {
    return this.get('pageNumber') * this.get('pageSize') + 1;
  }),
  rangeEnd: computed('rangeStart', 'pageSize', 'total', function () {
    const end = this.get('rangeStart') + this.get('pageSize') - 1;
    return end > this.get('total') ? this.get('total') : end;
  }),
  isFirstPage: equal('pageNumber', 0),
  isLastPage: computed('rangeEnd', 'total', function() {
    return this.get('rangeEnd') == this.get('total');
  }),
  didReceiveAttrs() {
    this._super(...arguments);
    assert('{{card-pagination}} requires a `prev` action or null for no action.', this.get('prev') !== undefined);
    assert('{{card-pagination}} requires a `next` action or null for no action.', this.get('next') !== undefined);
  },
  actions: {
    prev: function() {
      this.get('prev')();
    },
    next: function() {
      this.get('next')();
    }
  }
});
