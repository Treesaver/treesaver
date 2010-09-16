/**
 * @fileoverview String helper functions
 */

goog.provide('treesaver.string');

// Add string.trim() if it's not there
if (!String.prototype.trim) {
  String.prototype.trim = function () {
    return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
  };
}
