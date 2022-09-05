'use strict';

module.exports = {
  name: require('./package').name,
  isDevelopingAddon() {
    return this.app.env === 'development';
  },
  included: function (/* app */) {
    this._super.included.apply(this, arguments);
  },
};
