/**
 * @fileoverview Reading UI
 */

goog.provide('treesaver.ui');

goog.require('treesaver.debug');
goog.require('treesaver.ui.input');
goog.require('treesaver.ui.Article');
goog.require('treesaver.ui.ArticleManager');
goog.require('treesaver.ui.Chrome');
goog.require('treesaver.ui.StateManager');

/**
 * Load the UI
 *
 * @param {string=} originalHTML
 */
treesaver.ui.load = function(originalHTML) {
  if (!originalHTML) {
    originalHTML = document.body.innerHTML;
  }

  treesaver.ui.originalHTML_ = originalHTML;

  treesaver.debug.info('UI load begin');

  // Make sure we clean up when leaving the page
  treesaver.events.addListener(window, 'unload', treesaver.ui.unload);

  // Setup input handlers
  treesaver.ui.input.load();

  // Kick off boot process, but back up if any single item fails
  if (treesaver.ui.StateManager.load() &&
      // Grids
      treesaver.ui.ArticleManager.load(originalHTML)) {
  }
  else {
    treesaver.debug.error('Load failed');

    treesaver.ui.unload();
  }
};

/**
 * Unload the UI and cleanup
 */
treesaver.ui.unload = function() {
  treesaver.debug.info('UI unloading');

  treesaver.events.removeListener(window, 'unload', treesaver.ui.unload);

  treesaver.ui.input.unload();
  treesaver.ui.ArticleManager.unload();
  treesaver.ui.StateManager.unload();

  treesaver.boot.unload();

  // Restore the original HTML
  document.body.innerHTML = treesaver.ui.originalHTML_;
};

