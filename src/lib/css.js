/**
 * @fileoverview CSS helper functions
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

// IE doesn't support getComputedStyle
if (SUPPORT_IE &&
    !(document.defaultView && document.defaultView.getComputedStyle)) {
  // Patch to use MSIE API
  treesaver.css.getStyleObject = function(el) {
    return el.currentStyle;
  };
}
