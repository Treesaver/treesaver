/**
 * @fileoverview Reading UI.
 */

goog.provide('treesaver.core');

goog.require('treesaver.debug');
goog.require('treesaver.styles');
goog.require('treesaver.ui.Article');
goog.require('treesaver.ui.ArticleManager');
goog.require('treesaver.ui.Chrome');
goog.require('treesaver.ui.StateManager');

/**
 * Load the UI
 */
treesaver.core.load = function() {
  treesaver.debug.info('Core load begin');

  // Make sure we clean up when leaving the page
  treesaver.events.addListener(window, 'unload', treesaver.core.unload);

  // Root element for listening to UI events
  treesaver.ui.eventRoot = treesaver.inContainedMode ?
    treesaver.tsContainer : window;

  // Kick off boot process, but back up if any single item fails
  if (treesaver.ui.StateManager.load() &&
      // Grids
      treesaver.ui.ArticleManager.load(treesaver.originalHtml)) {
  }
  else {
    treesaver.debug.error('Load failed');

    treesaver.core.unload();
  }
};

/**
 * Unload the UI and cleanup
 */
treesaver.core.unload = function() {
  treesaver.debug.info('Core unloading');

  treesaver.events.removeListener(window, 'unload', treesaver.core.unload);

  treesaver.ui.ArticleManager.unload();
  treesaver.ui.StateManager.unload();

  treesaver.unload();
};
