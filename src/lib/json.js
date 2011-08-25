/**
 * @fileoverview JSON wrapper methods for older browsers.
 */

goog.provide('treesaver.json');

goog.require('treesaver.debug');

goog.scope(function() {
  var json = treesaver.json,
      debug = treesaver.debug,
      nativeJSON = window.JSON;

  /**
   * Parse JSON and return the object
   *
   * @param {!string} str
   * @return {*}
   */
  json.parse = function(str) {
    return nativeJSON.parse(str);
  };

  /**
   * Convert a value into JSON
   *
   * @param {*} val
   * @return {!string}
   */
  json.stringify = function(val) {
    return nativeJSON.stringify(val);
  };
});
