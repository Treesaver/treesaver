/**
 * @fileoverview Responsible for managing the application state. Should really be called ChromeManager.
 */

goog.provide('treesaver.ui.StateManager');

goog.require('treesaver.capabilities');
goog.require('treesaver.constants');
goog.require('treesaver.debug');
goog.require('treesaver.dimensions');
goog.require('treesaver.dom');
goog.require('treesaver.events');
goog.require('treesaver.resources');
goog.require('treesaver.scheduler');
goog.require('treesaver.ui.Chrome');
goog.require('treesaver.ui.LightBox');

goog.scope(function() {
  var StateManager = treesaver.ui.StateManager,
      capabilities = treesaver.capabilities,
      debug = treesaver.debug,
      dimensions = treesaver.dimensions,
      dom = treesaver.dom,
      events = treesaver.events,
      resources = treesaver.resources,
      scheduler = treesaver.scheduler,
      Chrome = treesaver.ui.Chrome,
      LightBox = treesaver.ui.LightBox;

  /**
   * Current state
   */
  StateManager.state_;

  /**
   * Storage for all the chromes
   *
   * @type {Array.<treesaver.ui.Chrome>}
   */
  StateManager.chromes_;

  /**
   * Initialize the state manager
   *
   * @return {boolean}
   */
  StateManager.load = function() {
    // Setup state
    StateManager.state_ = {
      orientation: 0,
      size: { w: 0, h: 0 }
    };

    // Clean the body
    dom.clearChildren(/** @type {!Element} */ (treesaver.tsContainer));

    // Install container for chrome used to measure screen space, etc
    StateManager.state_.chromeContainer = StateManager.getChromeContainer_();

    // Get or install the viewport
    StateManager.state_.viewport = StateManager.getViewport_();

    // Get the chromes and lightboxes
    StateManager.chromes_ = StateManager.getChromes_();
    StateManager.lightboxes_ = StateManager.getLightBoxes_();

    // Can't do anything without mah chrome
    if (!StateManager.chromes_.length) {
      debug.error('No chromes');

      return false;
    }

    // Find and install the first chrome by calling checkState manually (this will also set up the size)
    StateManager.checkState();

    // Setup checkstate timer
    scheduler.repeat(StateManager.checkState, CHECK_STATE_INTERVAL, Infinity, [], 'checkState');

    if (capabilities.SUPPORTS_ORIENTATION &&
        !treesaver.inContainedMode &&
        !capabilities.IS_FULLSCREEN) {
      events.addListener(window, 'orientationchange',
        StateManager.onOrientationChange);

      // Hide the address bar on iPhone
      scheduler.delay(window.scrollTo, 100, [0, 0]);
    }

    return true;
  };

  StateManager.unload = function() {
    // Remove handler
    if (capabilities.SUPPORTS_ORIENTATION && !treesaver.inContainedMode) {
      events.removeListener(window, 'orientationchange', StateManager.onOrientationChange);
    }

    // Deactive any active chrome
    if (StateManager.state_.chrome) {
      StateManager.state_.chrome.deactivate();
    }

    // Lose references
    StateManager.state_ = null;
    StateManager.chromes_ = null;
    StateManager.lightboxes_ = null;
  };

  /**
   * @type {Object.<string, string>}
   */
  StateManager.events = {
    CHROMECHANGED: 'treesaver.chromechanged'
  };

  /**
   * @private
   * @return {!Element}
   */
  StateManager.getChromeContainer_ = function() {
    if (treesaver.inContainedMode) {
      return treesaver.tsContainer;
    }
    else {
      var container = document.createElement('div');
      container.setAttribute('id', 'chromeContainer');
      treesaver.tsContainer.appendChild(container);
      return container;
    }
  };

  /**
   * @private
   * @return {!Element}
   */
  StateManager.getViewport_ = function() {
    var viewport = dom.querySelectorAll('meta[name=viewport]')[0];

    if (!viewport) {
      // Create a viewport if one doesn't exist
      viewport = document.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      dom.querySelectorAll('head')[0].appendChild(viewport);
    }

    return viewport;
  };

  /**
   * @private
   * @return {!Array.<treesaver.ui.Chrome>}
   */
  StateManager.getChromes_ = function() {
    var chromes = [];

    resources.findByClassName('chrome').forEach(function(node) {
      var chrome,
          requires = node.getAttribute('data-requires');

      if (requires && !capabilities.check(requires.split(' '))) {
        // Doesn't meet our requirements, skip
        return;
      }

      StateManager.state_.chromeContainer.appendChild(node);

      chrome = new Chrome(node);
      chromes.push(chrome);

      StateManager.state_.chromeContainer.removeChild(node);
    });

    return chromes;
  };

  /**
   * @private
   * @return {!Array.<treesaver.ui.LightBox>}
   */
  StateManager.getLightBoxes_ = function() {
    var lightboxes = [];

    resources.findByClassName('lightbox').forEach(function(node) {
      var lightbox,
          requires = node.getAttribute('data-requires');

      if (requires && !capabilities.check(requires.split(' '))) {
        // Doesn't meet our requirements, skip
        return;
      }

      StateManager.state_.chromeContainer.appendChild(node);

      lightbox = new LightBox(node);
      lightboxes.push(lightbox);

      StateManager.state_.chromeContainer.removeChild(node);
    });

    return lightboxes;
  };

  /**
   * Detect any changes in orientation, and update the viewport accordingly
   */
  StateManager.onOrientationChange = function() {
    if (StateManager.state_.orientation === window['orientation']) {
      // Nothing to do (false alarm?)
      return;
    }

    // TODO: Fire event?
    //
    // TODO: Refactor this manual update
    capabilities.updateClasses();

    StateManager.state_.orientation = window['orientation'];

    if (StateManager.state_.orientation % 180) {
      // Rotated (landscape)
      StateManager.state_.viewport.setAttribute('content',
        'width=device-height, height=device-width');
    }
    else {
      // Normal
      StateManager.state_.viewport.setAttribute('content',
        'width=device-width, height=device-height');
    }

    // Hide the address bar on iOS & others
    if (capabilities.SUPPORTS_ORIENTATION &&
        !treesaver.inContainedMode &&
        !capabilities.IS_FULLSCREEN) {
      window.scrollTo(0, 0);
    }

    // TODO: Update classes for styling?

    // TODO: Access widths to force layout?
  };

  /**
   * Gets the size currently visible within the browser
   *
   * @private
   * @return {{ w: number, h: number }}
   */
  StateManager.getAvailableSize_ = function() {
    if (capabilities.IS_NATIVE_APP || !treesaver.inContainedMode) {
      if (window.pageYOffset || window.pageXOffset) {
        window.scrollTo(0, 0);
      }

      return {
        w: window.innerWidth,
        h: window.innerHeight
      };
    }
    else {
      return dimensions.getSize(treesaver.tsContainer);
    }
  };

  /**
   * Get a lightbox for display
   *
   * @return {?treesaver.ui.LightBox}
   */
  StateManager.getLightBox = function() {
    var availSize = StateManager.getAvailableSize_();

    return LightBox.select(StateManager.lightboxes_, availSize);
  };

  /**
   * Tick function
   */
  StateManager.checkState = function() {
    var availSize = StateManager.getAvailableSize_(),
        newChrome;

    // Check if we're at a new size
    if (availSize.h !== StateManager.state_.size.h || availSize.w !== StateManager.state_.size.w) {
      StateManager.state_.size = availSize;

      // Check if chrome still fits
      if (!StateManager.state_.chrome ||
          !StateManager.state_.chrome.meetsRequirements() ||
          !StateManager.state_.chrome.fits(availSize)) {
        // Chrome doesn't fit, need to install a new one
        newChrome = Chrome.select(StateManager.chromes_, availSize);

        if (!newChrome) {
          // TODO: Fire chrome failed event
          // TODO: Show error page (no chrome)
          return;
        }

        // Remove existing chrome
        dom.clearChildren(StateManager.state_.chromeContainer);
        // Deactivate previous
        if (StateManager.state_.chrome) {
          StateManager.state_.chrome.deactivate();
        }

        // Activate and store
        StateManager.state_.chromeContainer.appendChild(newChrome.activate());
        StateManager.state_.chrome = newChrome;

        // Fire chrome change event
        events.fireEvent(
          document, StateManager.events.CHROMECHANGED, {
            'node': newChrome.node
          }
        );
      }

      // Chrome handles page re-layout, if necessary
      StateManager.state_.chrome.setSize(availSize);
    }
  };

  // Expose special functions for use by the native app wrappers
  if (capabilities.IS_NATIVE_APP) {
    // UI is shown/hidden based on the active and idle events fired by the
    // currently visible chrome.
    //
    // Since the next/prev, etc controls are contained within external UI,
    // need to expose functions that both go to next/prev and fire active
    //
    // Create a wrapper function that calls active on the current chrome
    // before calling the actual function
    treesaver.activeFunctionWrapper = function(f) {
      return (function() {
        // Manually call the chrome's function, if it exists
        if (StateManager.state_.chrome) {
          StateManager.state_.chrome.setUiActive_();
        }

        // Call original function
        f();
      });
    };

    goog.exportSymbol('treesaver.nextPage',
      treesaver.activeFunctionWrapper(treesaver.ui.ArticleManager.nextPage));
    goog.exportSymbol('treesaver.previousPage',
      treesaver.activeFunctionWrapper(treesaver.ui.ArticleManager.previousPage));
    goog.exportSymbol('treesaver.nextArticle',
      treesaver.activeFunctionWrapper(treesaver.ui.ArticleManager.nextArticle));
    goog.exportSymbol('treesaver.previousArticle',
      treesaver.activeFunctionWrapper(treesaver.ui.ArticleManager.previousArticle));
  }
});
