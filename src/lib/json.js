/**
 * @fileoverview JSON wrapper methods for older browsers
 */

goog.provide('treesaver.json');

goog.require('treesaver.debug');
goog.require('treesaver.capabilities');

/**
 * Parse JSON and return the object
 *
 * @param {!string} str
 * @return {*}
 */
treesaver.json.parse = function(str) {
  return window.JSON.parse(str);
};

/**
 * Convert a value into JSON
 *
 * @param {*} value
 * @return {!string}
 */
treesaver.json.stringify = function(val) {
  return window.JSON.stringify(val);
};

if (SUPPORT_LEGACY && !'JSON' in window) {
  treesaver.debug.info("Non-native JSON implementation");

  // TODO: Consider a secure implementation
  treesaver.json.parse = function(str) {
    var s = '(' + str + ')';

    try {
      return eval(s);
    }
    catch (ex) {
    }

    // TODO: Throw error?
    return null;
  };

  // Only storage uses stringify, and does so only on browsers with JSON
  // support, so we don't need to support this manually
  treesaver.json.stringify = function(val) {
    return '';
  }
}
