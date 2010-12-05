/**
 * @fileoverview Shiv that ensures old versions of IE properly parse HTML5
 * elements.
 */

goog.provide('treesaver.html5');

goog.require('treesaver.constants');

if (SUPPORT_IE) {
  // HTML5 shim, courtesy of: https://github.com/lindsayevans/html5-shiv
  eval("/*@cc_on (function(a,b,c){while(b--)a.createElement(c[b])})(document,21,['abbr','article','aside','audio','canvas','details','figcaption','figure','footer','header','hgroup','mark','menu','meter','nav','output','progress','section','summary','time','video'])@*/");
}
