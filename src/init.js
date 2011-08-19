/**
 * @fileoverview Bootstrap for the Treesaver library.
 */

/**
 * @preserve Copyright 2011 Filipe Fortes ( www.fortes.com ).
 * Version: 0.1.
 *
 * Licensed under MIT and GPLv2.
 */

goog.provide('treesaver');

goog.require('treesaver.boot');
goog.require('treesaver.capabilities');
goog.require('treesaver.constants');
goog.require('treesaver.debug');
goog.require('treesaver.history');
goog.require('treesaver.html5');

// Begin loading
if (treesaver.capabilities.SUPPORTS_TREESAVER) {
  treesaver.boot.load();
}
else {
  treesaver.debug.warn('Treesaver not supported');
}

/**
 * The version number of the code used to build a production
 * bundle.
 *
 * @define {string}
 */
treesaver.VERSION = 'dev';

goog.exportSymbol('treesaver.VERSION', treesaver.VERSION, window);

/**
 * A global configuration object. Use only as a last resort.
 */
treesaver.config = {};

goog.exportSymbol('treesaver.config', treesaver.config, window);

// Register Handlebars helpers
Handlebars.registerHelper('encodeURIComponent', encodeURIComponent);
Handlebars.registerHelper('encodeURI', encodeURI);
