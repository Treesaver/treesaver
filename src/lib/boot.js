/**
 * @fileoverview Initializes the framework, loading required files and
 * resources.
 */

goog.provide('treesaver.boot');

goog.require('treesaver.capabilities');
goog.require('treesaver.constants');
goog.require('treesaver.debug');
goog.require('treesaver.dom');
goog.require('treesaver.domready');
goog.require('treesaver.events');
goog.require('treesaver.resources');
goog.require('treesaver.scheduler');
goog.require('treesaver.scriptloader');

/**
 * @const
 * @type {number}
 */
treesaver.boot.LOAD_TIMEOUT = 5000; // 5 seconds

/**
 * Load scripts and required resources
 */
treesaver.boot.load = function() {
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
    treesaver.boot.resourcesLoaded_ = true;
    treesaver.boot.loadProgress_();
  });

  // Load other scripts
  if (USE_MODULES) {
    // goog.require doesn't play nice with the DOM and async loading, so
    // we require the files beforehand
    //
    // However, we must alias the goog.require call so it doesn't get caught
    // in the dependency calculations
    if (!COMPILED) {
      var gr = goog.require;

      // Wrap in a try-catch in order to avoid errors
      try {
        gr('treesaver.ui');
      }
      catch (ex) {
        // Ignore
      }
    }

    treesaver.scriptloader.load('ui.js', function(name) {
      treesaver.boot.uiLoaded_ = true;
      treesaver.boot.loadProgress_();
    });
  }

  // Watch for dom ready
  if (!treesaver.domready.ready()) {
    treesaver.events.addListener(
      document,
      treesaver.domready.events.READY,
      treesaver.boot.domReady
    );
  }
  else {
    // DOM is already ready, call directly
    treesaver.boot.domReady();
  }

  if (!goog.DEBUG || !window.TS_NO_AUTOLOAD) {
    // Fallback in case things never load
    treesaver.scheduler.delay(
      treesaver.boot.unload,
      treesaver.boot.LOAD_TIMEOUT,
      [],
      'unboot'
    );
  }
};

/**
 * Recover from errors and return the page to the original state
 */
treesaver.boot.unload = function() {
  treesaver.debug.info('Treesaver unbooting');

  // Restore HTML
  if (!WITHIN_IOS_WRAPPER && treesaver.boot.inContainedMode) {
    treesaver.boot.tsContainer.innerHTML = treesaver.boot.originalContainerHtml;
  }
  else if (treesaver.boot.originalHtml) {
    treesaver.boot.tsContainer.innerHTML = treesaver.boot.originalHtml;
  }

  // First, do standard cleanup
  treesaver.boot.cleanup_();

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
treesaver.boot.cleanup_ = function() {
  // Clear out the unboot timeout
  treesaver.scheduler.clear('unboot');

  // Remove DOM ready handler
  treesaver.events.removeListener(
    document,
    treesaver.domready.events.READY,
    treesaver.boot.domReady
  );

  // Kill loading flags
  delete treesaver.boot.resourcesLoaded_;
  if (USE_MODULES) {
    delete treesaver.boot.uiLoaded_;
  }
  delete treesaver.boot.domReady_;
};

/**
 * Receive DOM ready event
 *
 * @param {Event=} e
 */
treesaver.boot.domReady = function(e) {
  treesaver.boot.domReady_ = true;

  if (!WITHIN_IOS_WRAPPER) {
    treesaver.boot.tsContainer = document.getElementById('ts_container');
  }

  if (!WITHIN_IOS_WRAPPER && treesaver.boot.tsContainer) {
    // Is the treesaver display area contained within a portion of the page?
    treesaver.boot.inContainedMode = true;
    treesaver.boot.originalContainerHtml = treesaver.boot.tsContainer.innerHTML;
  }
  else {
    treesaver.boot.inContainedMode = false;
    treesaver.boot.tsContainer = document.body;
  }

  treesaver.boot.originalHtml = document.body.innerHTML;

  // Remove main content
  treesaver.dom.clearChildren(/** @type {!Element} */(treesaver.boot.tsContainer));

  if (!goog.DEBUG || !window.TS_NO_AUTOLOAD) {
    // Place a loading message
    treesaver.boot.tsContainer.innerHTML =
      '<div id="loading">Loading ' + document.title + '...</div>';
    // Re-enable content display
    document.documentElement.style.display = 'block';
  }

  // Update state
  treesaver.boot.loadProgress_();
};

/**
 *
 * @private
 */
treesaver.boot.loadProgress_ = function() {
  if (!treesaver.boot.resourcesLoaded_) {
    // Can't show loading screen until resources are loaded
    return;
  }

  if (USE_MODULES && !treesaver.boot.uiLoaded_) {
    // Must wait for the other modules to load
    return;
  }

  if (!treesaver.boot.domReady_) {
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
  treesaver.boot.cleanup_();

  if (!goog.DEBUG || !window.TS_NO_AUTOLOAD) {
    // Start the UI

    // TODO: In compiled module mode, this function won't be visible ...
    // may need to export
    treesaver.ui.load();
  }
};
