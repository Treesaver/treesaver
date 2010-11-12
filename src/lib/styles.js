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

treesaver.styles.stylesheet_ = document.createElement('style');
treesaver.styles.stylesheet_.setAttribute('type', 'text/css');

if (treesaver.dom.getElementsByTagName('head').length) {
  treesaver.dom.getElementsByTagName('head')[0].appendChild(treesaver.styles.stylesheet_);
  treesaver.styles.stylesheet_ = document.styleSheets[document.styleSheets.length - 1];

  // Offscreen
  treesaver.styles.insertRule('.offscreen',
    'position:absolute;top:-200%;right:-200%;visibility:hidden;');
  // Grids
  treesaver.styles.insertRule('.grid', 'top:50%');
  if (treesaver.capabilities.SUPPORTS_CSSTRANSITIONS) {
    treesaver.styles.insertRule('.grid',
      'transition:transform ease-out ' + MAX_ANIMATION_DURATION / 1000 + 's');
    if (treesaver.capabilities.cssPrefix) {
      treesaver.styles.insertRule('.grid',
        treesaver.capabilities.cssPrefix + 'transition:' +
        treesaver.capabilities.cssPrefix + 'transform ease-out ' +
        MAX_ANIMATION_DURATION / 1000 + 's'
      );
    }
    if (treesaver.capabilities.SUPPORTS_CSSTRANSFORMS3D) {
      treesaver.styles.insertRule('.grid', 'backface-visibility:hidden');
      if (treesaver.capabilities.cssPrefix) {
        treesaver.styles.insertRule('.grid',
          treesaver.capabilities.cssPrefix + 'backface-visibility:hidden');
      }
    }
  }
}
else {
  treesaver.debug.error("No head to put default stylesheet into");
}
