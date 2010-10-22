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

  if (!goog.DEBUG || !window.TREESAVER_NO_AUTOLOAD) {
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

  if (!goog.DEBUG || !window.TREESAVER_NO_AUTOLOAD) {
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
  if (treesaver.boot.domReady_) {
    document.body.innerHTML = treesaver.boot.originalHtml_;
  }

  // First, do standard cleanup
  treesaver.boot.cleanup_();

  // Stop all scheduled tasks
  treesaver.scheduler.stopAll();

  // Clean up libraries
  treesaver.resources.unload();
  treesaver.network.unload();

  // Setup classes
  treesaver.dom.removeClass(document.documentElement, 'treesaver');
  treesaver.dom.addClass(document.documentElement, 'no-treesaver');

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
  delete treesaver.boot.uiLoaded_;
  delete treesaver.boot.domReady_;

  // Kill other data storage
  delete treesaver.boot.originalHtml_;
};

/**
 * Receive DOM ready event
 *
 * @param {Event=} e
 */
treesaver.boot.domReady = function(e) {
  if (!document.body) {
    treesaver.debug.error('DOMReady callback without document.body');
  }

  treesaver.boot.domReady_ = true;
  // Remove main content
  treesaver.boot.originalHtml_ = treesaver.boot.cleanOriginalHtml_();

  if (!goog.DEBUG || !window.TREESAVER_NO_AUTOLOAD) {
    // Place a loading message
    document.body.innerHTML = 'Loading ' + document.title + '...';
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

  var html = treesaver.boot.originalHtml_;

  // Clean up handlers and timers
  treesaver.boot.cleanup_();

  if (!goog.DEBUG || !window.TREESAVER_NO_AUTOLOAD) {
    // Start the UI

    // TODO: In compiled module mode, this function won't be visible ...
    // may need to export
    treesaver.ui.load(html);
  }
};

/**
 * Remove the original page content and return the HTML
 *
 * @private
 * @return {!string}
 */
treesaver.boot.cleanOriginalHtml_ = function() {
  var html = document.body.innerHTML;

  if (!goog.DEBUG || !window.TREESAVER_NO_AUTOLOAD) {
    // TODO: Are there elements that should be retained?
    treesaver.dom.clearChildren(/** @type {!Element} */(document.body));
  }

  return html;
};
