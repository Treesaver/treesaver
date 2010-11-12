/**
 * @fileoverview Create a stylesheet with the built-in styles required by Treesaver
 */

goog.provide('treesaver.styles');

goog.require('treesaver.constants');
goog.require('treesaver.debug');
goog.require('treesaver.dom');

/**
 * @param {!string} selector
 * @param {!string} text
 */
treesaver.styles.insertRule = function(selector, text) {
  if (!SUPPORT_IE || 'insertRule' in treesaver.styles.stylesheet_) {
    treesaver.styles.stylesheet_.insertRule(selector + '{' + text + '}', 0);
  }
  else {
    treesaver.styles.stylesheet_.addRule(selector, text);
  }
}

treesaver.styles.stylesheet_ = document.styleSheets[0];

if (treesaver.styles.stylesheet_) {
  // Offscreen
  treesaver.styles.insertRule('.offscreen',
    'position:absolute;top:-200%;right:-200%;visibility:hidden;');
  // Grids
  treesaver.styles.insertRule('.grid', 'top:50%');
}
else {
  treesaver.debug.error("No stylesheet to put default styles into");
}
