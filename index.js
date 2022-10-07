'use strict';

module.exports = {
  name: require('./package').name,
  isDevelopingAddon() {
    return process.env.EMBER_ENV === 'development';
  },
  included: function (/* app */) {
    this._super.included.apply(this, arguments);
  },
};
