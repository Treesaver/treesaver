/**
 * @fileoverview String helper functions.
 */

goog.provide('treesaver.string');

// Add string.trim() if it's not there, which happens in Safari pre-5 and
// IE pre 9
if (!'trim' in String.prototype) {
  String.prototype.trim = function() {
    return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
  };
}
