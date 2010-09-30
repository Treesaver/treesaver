/**
 * @fileoverview Shiv that ensures old versions of IE properly parse HTML5
 * elements.
 */

goog.provide('treesaver.html5');

// Use eval because Closure Compiler strips out comments
if (SUPPORT_IE && eval('/*@cc_on!@*/0')) {
  (function() {
    var els = ['abbr', 'article', 'aside', 'audio', 'canvas', 'details',
               'figcaption', 'figure', 'footer', 'header', 'hgroup',
               'mark', 'meter', 'nav', 'output', 'progress', 'section',
               'summary', 'time', 'video'],
        i;

    // HTML5 shiv for IE, hat tip Resig: http://ejohn.org/blog/html5-shiv/
    for (i = els.length - 1; i >= 0; i -= 1) {
      document.createElement(els[i]);
    }
  }());
}
