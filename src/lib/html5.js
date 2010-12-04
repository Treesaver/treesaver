/**
 * @fileoverview Shiv that ensures old versions of IE properly parse HTML5
 * elements.
 */

goog.provide('treesaver.html5');

goog.require('treesaver.constants');

if (SUPPORT_IE) {
  // HTML5 shim, courtesy of: http://code.google.com/p/html5shim/
  eval("/*@cc_on'abbr article aside audio canvas details figcaption figure footer header hgroup mark meter nav output progress section summary time video'.replace(/\w+/g,function(n){document.createElement(n)})@*/")
}
