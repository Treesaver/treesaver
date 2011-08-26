/**
 * @fileoverview Create a stylesheet with the built-in styles required by Treesaver
 */

goog.provide('treesaver.styles');

goog.require('treesaver.capabilities');
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

treesaver.styles.stylesheet_ = document.createElement('style');
treesaver.styles.stylesheet_.setAttribute('type', 'text/css');

if (treesaver.dom.querySelectorAll('head').length) {
  treesaver.dom.querySelectorAll('head')[0].appendChild(treesaver.styles.stylesheet_);
  treesaver.styles.stylesheet_ = document.styleSheets[document.styleSheets.length - 1];

  // Offscreen
  treesaver.styles.insertRule('.offscreen',
    'position:absolute;top:-200%;right:-200%;visibility:hidden;');
  // Grids are centered in the viewer
  treesaver.styles.insertRule('.viewer .grid', 'top:50%;left:50%;margin:0');
}
else {
  treesaver.debug.error("No head to put default stylesheet into");
}
