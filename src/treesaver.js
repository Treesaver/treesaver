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
goog.require('treesaver.events');
goog.require('treesaver.fonts');
goog.require('treesaver.history');
goog.require('treesaver.resources');
goog.require('treesaver.scheduler');
goog.require('treesaver.styles');
goog.require('treesaver.ui.Article');
goog.require('treesaver.ui.ArticleManager');
goog.require('treesaver.ui.Chrome');
goog.require('treesaver.ui.StateManager');

goog.scope(function() {
  var debug = treesaver.debug,
      dom = treesaver.dom,
      events = treesaver.events,
      fonts = treesaver.fonts,
      capabilities = treesaver.capabilities,
      ArticleManager = treesaver.ui.ArticleManager,
      StateManager = treesaver.ui.StateManager;


  /**
   * Treesaver events fired
   * @const
   * @type {Object.<string, string>}
   */
  treesaver.customevents = {
    LOADERSHOWN: 'treesaver.loader_shown'
  };

  /**
   * Load scripts and required resources
   */
  treesaver.boot = function() {
    debug.info('Begin Treesaver booting');

    if (!goog.DEBUG || !window.TS_NO_AUTOLOAD) {
      // Hide content to avoid ugly flashes
      document.documentElement.style.display = 'none';
    }

    // Initialize the network module
    treesaver.network.load();

    // Set capability flags
    capabilities.updateClasses();

    // Load resources
    treesaver.resources.load(function() {
      treesaver.resourcesLoaded_ = true;
      treesaver.bootProgress_();
    });

    fonts.load(function() {
      treesaver.fontsLoaded_ = true;
      treesaver.bootProgress_();
    });


    // Watch for dom ready
    if (/complete|loaded/.test(document.readyState)) {
      // DOM is already ready, call directly
      treesaver.domReady();
    }
    else {
      events.addListener(document, 'DOMContentLoaded', treesaver.domReady);
    }

    if (!WITHIN_IOS_WRAPPER && (!goog.DEBUG || !window.TS_NO_AUTOLOAD)) {
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
    debug.info('Treesaver unbooting');

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
    treesaver.fonts.unload();

    // Setup classes
    capabilities.resetClasses();

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
    events.removeListener(document, 'DOMContentLoaded', treesaver.domReady);

    // Kill loading flags
    delete treesaver.resourcesLoaded_;
    delete treesaver.domReady_;
  };

  /**
   * Receive DOM ready event
   *
   * @param {Event=} e Event object.
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
      dom.clearChildren(/** @type {!Element} */(treesaver.tsContainer));

      // Place a loading message
      treesaver.tsContainer.innerHTML =
        '<div id="loading">Loading ' + document.title + '...</div>';
      // Re-enable content display
      document.documentElement.style.display = 'block';

      events.fireEvent(document, treesaver.customevents.LOADERSHOWN);
    }

    // Update state
    treesaver.bootProgress_();
  };

  /**
   *
   * @private
   */
  treesaver.bootProgress_ = function() {
    if (!treesaver.resourcesLoaded_ || !treesaver.fontsLoaded_) {
      // Can't show loading screen until resources are loaded
      return;
    }

    if (!treesaver.domReady_) {
      debug.info('Load progress: DOM not ready yet');

      // Can't do anything if the DOM isn't ready
      return;
    }
    else {
      // TODO: Happens once in a while, need to track down
      if (!document.body) {
        debug.error('document.body not available after DOM ready');

        return;
      }
    }

    debug.info('Treesaver boot complete');

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
    debug.info('Load begin');

    // Make sure we clean up when leaving the page
    events.addListener(window, 'unload', treesaver.unload);

    // Root element for listening to UI events
    treesaver.ui.eventRoot = treesaver.inContainedMode ?
      treesaver.tsContainer : window;

    // Kick off boot process, but back up if any single item fails
    if (StateManager.load() &&
        // Grids
        ArticleManager.load(treesaver.originalHtml)) {
    }
    else {
      debug.error('Load failed');

      treesaver.unload();
    }
  };

  /**
   * Unload the UI and cleanup
   */
  treesaver.unload = function() {
    debug.info('Unloading');

    events.removeListener(window, 'unload', treesaver.unload);

    ArticleManager.unload();
    StateManager.unload();

    treesaver.unboot();
  };

  // Start the process
  if (capabilities.SUPPORTS_TREESAVER) {
    treesaver.boot();
  }
  else {
    debug.warn('Treesaver not supported');
  }
});
