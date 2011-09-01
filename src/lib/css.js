/**
 * @fileoverview CSS helper functions.
 */

goog.provide('treesaver.css');

/**
 * Return the computedStyle object, which varies based on
 * browsers
 * @param {?Element} el
 * @return {Object}
 */
treesaver.css.getStyleObject = function(el) {
  return document.defaultView.getComputedStyle(el, null);
};
