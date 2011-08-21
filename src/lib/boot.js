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
goog.require('treesaver.core');
goog.require('treesaver.debug');
goog.require('treesaver.dom');
goog.require('treesaver.domready');
goog.require('treesaver.events');
goog.require('treesaver.history');
goog.require('treesaver.html5');
goog.require('treesaver.resources');
goog.require('treesaver.scheduler');

/**
 * A global configuration object. Use only as a last resort.
 */
treesaver.config = {};

goog.exportSymbol('treesaver.config', treesaver.config, window);

/**
 * Load scripts and required resources
 */
treesaver.load = function() {
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
    treesaver.loadProgress_();
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
      treesaver.unload,
      treesaver.LOAD_TIMEOUT,
      [],
      'unboot'
    );
  }
};

/**
 * Recover from errors and return the page to the original state
 */
treesaver.unload = function() {
  treesaver.debug.info('Treesaver unng');

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

  treesaver.originalHtml = document.body.innerHTML;

  // Remove main content
  treesaver.dom.clearChildren(/** @type {!Element} */(treesaver.tsContainer));

  if (!goog.DEBUG || !window.TS_NO_AUTOLOAD) {
    // Place a loading message
    treesaver.tsContainer.innerHTML =
      '<div id="loading">Loading ' + document.title + '...</div>';
    // Re-enable content display
    document.documentElement.style.display = 'block';
  }

  // Update state
  treesaver.loadProgress_();
};

/**
 *
 * @private
 */
treesaver.loadProgress_ = function() {
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

    // TODO: In compiled module mode, this function won't be visible if in a
    // closure ... may need to export
    treesaver.core.load();
  }
};

// Begin loading
if (treesaver.capabilities.SUPPORTS_TREESAVER) {
  treesaver.load();
}
else {
  treesaver.debug.warn('Treesaver not supported');
}
