/**
 * @fileoverview Initializes the framework, loading required files and
 * resources.
 */

/**
 * @preserve Copyright 2011 Filipe Fortes ( www.fortes.com ).
 * Version: 0.1.
 *
 * Licensed under MIT and GPLv2.
 */

goog.provide('treesaver');

goog.require('treesaver.capabilities');
goog.require('treesaver.constants');
goog.require('treesaver.debug');
goog.require('treesaver.dom');
goog.require('treesaver.domready');
goog.require('treesaver.events');
goog.require('treesaver.history');
goog.require('treesaver.html5');
goog.require('treesaver.resources');
goog.require('treesaver.scheduler');
goog.require('treesaver.styles');
goog.require('treesaver.ui.Article');
goog.require('treesaver.ui.ArticleManager');
goog.require('treesaver.ui.Chrome');
goog.require('treesaver.ui.StateManager');

/**
 * Load scripts and required resources
 */
treesaver.boot = function() {
  treesaver.debug.info('Begin Treesaver booting');

  if (!goog.DEBUG || !window.TS_NO_AUTOLOAD) {
    // Hide content to avoid ugly flashes
    document.documentElement.style.display = 'none';
  }

  // Initialize the network module
  treesaver.network.load();

  // Set capability flags
  treesaver.capabilities.updateClasses();

  // Load resources
  treesaver.resources.load(function() {
    treesaver.resourcesLoaded_ = true;
    treesaver.bootProgress_();
  });

  // Watch for dom ready
  if (!treesaver.domready.ready()) {
    treesaver.events.addListener(
      document,
      treesaver.domready.events.READY,
      treesaver.domReady
    );
  }
  else {
    // DOM is already ready, call directly
    treesaver.domReady();
  }

  if (!goog.DEBUG || !window.TS_NO_AUTOLOAD) {
    // Fallback in case things never load
    treesaver.scheduler.delay(
      treesaver.unboot,
      treesaver.LOAD_TIMEOUT,
      [],
      'unboot'
    );
  }
};

/**
 * Recover from errors and return the page to the original state
 */
treesaver.unboot = function() {
  treesaver.debug.info('Treesaver unbooting');

  // Restore HTML
  if (!WITHIN_IOS_WRAPPER && treesaver.inContainedMode) {
    treesaver.tsContainer.innerHTML = treesaver.originalContainerHtml;
  }
  else if (treesaver.originalHtml) {
    treesaver.tsContainer.innerHTML = treesaver.originalHtml;
  }

  // First, do standard cleanup
  treesaver.cleanup_();

  // Stop all scheduled tasks
  treesaver.scheduler.stopAll();

  // Clean up libraries
  treesaver.resources.unload();
  treesaver.network.unload();

  // Setup classes
  treesaver.capabilities.resetClasses();

  // Show content again
  document.documentElement.style.display = 'block';
};

/**
 * Clean up boot-related timers and handlers
 * @private
 */
treesaver.cleanup_ = function() {
  // Clear out the unboot timeout
  treesaver.scheduler.clear('unboot');

  // Remove DOM ready handler
  treesaver.events.removeListener(
    document,
    treesaver.domready.events.READY,
    treesaver.domReady
  );

  // Kill loading flags
  delete treesaver.resourcesLoaded_;
  delete treesaver.domReady_;
};

/**
 * Receive DOM ready event
 *
 * @param {Event=} e
 */
treesaver.domReady = function(e) {
  treesaver.domReady_ = true;

  if (!WITHIN_IOS_WRAPPER) {
    treesaver.tsContainer = document.getElementById('ts_container');
  }

  if (!WITHIN_IOS_WRAPPER && treesaver.tsContainer) {
    // Is the treesaver display area contained within a portion of the page?
    treesaver.inContainedMode = true;
    treesaver.originalContainerHtml = treesaver.tsContainer.innerHTML;
  }
  else {
    treesaver.inContainedMode = false;
    treesaver.tsContainer = document.body;
  }

  if (!goog.DEBUG || !window.TS_NO_AUTOLOAD) {
    treesaver.originalHtml = document.body.innerHTML;

    // Remove main content
    treesaver.dom.clearChildren(/** @type {!Element} */(treesaver.tsContainer));

    // Place a loading message
    treesaver.tsContainer.innerHTML =
      '<div id="loading">Loading ' + document.title + '...</div>';
    // Re-enable content display
    document.documentElement.style.display = 'block';
  }

  // Update state
  treesaver.bootProgress_();
};

/**
 *
 * @private
 */
treesaver.bootProgress_ = function() {
  if (!treesaver.resourcesLoaded_) {
    // Can't show loading screen until resources are loaded
    return;
  }

  if (!treesaver.domReady_) {
    treesaver.debug.info('Load progress: DOM not ready yet');

    // Can't do anything if the DOM isn't ready
    return;
  }
  else {
    // TODO: Happens once in a while, need to track down
    if (!document.body) {
      treesaver.debug.error('document.body not available after DOM ready');

      return;
    }
  }

  treesaver.debug.info('Treesaver boot complete');

  // Clean up handlers and timers
  treesaver.cleanup_();

  if (!goog.DEBUG || !window.TS_NO_AUTOLOAD) {
    // Start loading the core (UI, layout, etc)

    // Start the real proces
    treesaver.load();
  }
};

/**
 * Load the UI
 */
treesaver.load = function() {
  treesaver.debug.info('Load begin');

  // Make sure we clean up when leaving the page
  treesaver.events.addListener(window, 'unload', treesaver.unload);

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

    treesaver.unload();
  }
};

/**
 * Unload the UI and cleanup
 */
treesaver.unload = function() {
  treesaver.debug.info('Unloading');

  treesaver.events.removeListener(window, 'unload', treesaver.unload);

  treesaver.ui.ArticleManager.unload();
  treesaver.ui.StateManager.unload();

  treesaver.unboot();
};

// Start the process
if (treesaver.capabilities.SUPPORTS_TREESAVER) {
  treesaver.boot();
}
else {
  treesaver.debug.warn('Treesaver not supported');
}
