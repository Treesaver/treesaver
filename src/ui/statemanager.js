/**
 * @fileoverview Responsible for managing the application state. Should really be called ChromeManager.
 */

goog.provide('treesaver.ui.StateManager');

goog.require('treesaver.capabilities');
goog.require('treesaver.constants');
goog.require('treesaver.debug');
goog.require('treesaver.dom');
goog.require('treesaver.events');
goog.require('treesaver.resources');
goog.require('treesaver.ui.Chrome');
goog.require('treesaver.ui.LightBox');

/**
 * Current state
 */
treesaver.ui.StateManager.state_;

/**
 * Storage for all the chromes
 *
 * @type {Array.<treesaver.ui.Chrome>}
 */
treesaver.ui.StateManager.chromes_;

/**
 * Initialize the state manager
 *
 * @return {boolean}
 */
treesaver.ui.StateManager.load = function() {
  // Setup state
  treesaver.ui.StateManager.state_ = {
    orientation: 0,
    size: { w: 0, h: 0 }
  };

  // Clean the body
  treesaver.dom.clearChildren(/** @type {!Element} */ (treesaver.boot.tsContainer));

  // Install container for chrome used to measure screen space, etc
  treesaver.ui.StateManager.state_.chromeContainer = treesaver.ui.StateManager.getChromeContainer_();

  // Get or install the viewport
  treesaver.ui.StateManager.state_.viewport = treesaver.ui.StateManager.getViewport_();

  // Get the chromes and lightboxes
  treesaver.ui.StateManager.chromes_ = treesaver.ui.StateManager.getChromes_();
  treesaver.ui.StateManager.lightboxes_ = treesaver.ui.StateManager.getLightBoxes_();

  // Can't do anything without mah chrome
  if (!treesaver.ui.StateManager.chromes_.length) {
    treesaver.debug.error('No chromes');

    return false;
  }

  // Find and install the first chrome by calling checkState manually (this will also set up the size)
  treesaver.ui.StateManager.checkState();

  // Setup checkstate timer
  treesaver.scheduler.repeat(treesaver.ui.StateManager.checkState, CHECK_STATE_INTERVAL, Infinity, [], 'checkState');

  if (treesaver.capabilities.SUPPORTS_ORIENTATION && !treesaver.boot.inContainedMode) {
    treesaver.events.addListener(window, 'orientationchange',
      treesaver.ui.StateManager.onOrientationChange);

    // Hide the address bar on iPhone
    treesaver.scheduler.delay(function() {
      // IE's window.scrollTo is some kind of weird function without an apply()
      // so we have to wrap this call within a wrapper to avoid nasty errors
      window.scrollTo(0, 1);
    }, 100);
  }

  return true;
};

treesaver.ui.StateManager.unload = function() {
  // Remove handler
  if (treesaver.capabilities.SUPPORTS_ORIENTATION && !treesaver.boot.inContainedMode) {
    treesaver.events.removeListener(window, 'orientationchange',
      treesaver.ui.StateManager.onOrientationChange);
  }

  // Deactive any active chrome
  if (treesaver.ui.StateManager.state_.chrome) {
    treesaver.ui.StateManager.state_.chrome.deactivate();
  }

  // Lose references
  treesaver.ui.StateManager.state_ = null;
  treesaver.ui.StateManager.chromes_ = null;
  treesaver.ui.StateManager.lightboxes_ = null;
};

/**
 * @private
 * @return {!Element}
 */
treesaver.ui.StateManager.getChromeContainer_ = function() {
  if (treesaver.boot.inContainedMode) {
    return treesaver.boot.tsContainer;
  }
  else {
    var container = document.createElement('div');
    container.setAttribute('id', 'chromeContainer');
    treesaver.boot.tsContainer.appendChild(container);
    return container;
  }
};

/**
 * @private
 * @return {!Element}
 */
treesaver.ui.StateManager.getViewport_ = function() {
  var viewport = treesaver.dom.getElementsByProperty('name', 'viewport', 'meta')[0];

  if (!viewport) {
    // Create a viewport if one doesn't exist
    viewport = document.createElement('meta');
    viewport.setAttribute('name', 'viewport');
    treesaver.dom.getElementsByTagName('head')[0].appendChild(viewport);
  }

  return viewport;
};

/**
 * @private
 * @return {!Array.<treesaver.ui.Chrome>}
 */
treesaver.ui.StateManager.getChromes_ = function() {
  var chromes = [];

  treesaver.resources.findByClassName('chrome').forEach(function(node) {
    var chrome,
        requires = node.getAttribute('data-requires');

    if (requires && !treesaver.capabilities.check(requires.split(' '))) {
      // Doesn't meet our requirements, skip
      return;
    }

    treesaver.ui.StateManager.state_.chromeContainer.appendChild(node);

    chrome = new treesaver.ui.Chrome(node);
    chromes.push(chrome);

    treesaver.ui.StateManager.state_.chromeContainer.removeChild(node);
  });

  return chromes;
};

/**
 * @private
 * @return {!Array.<treesaver.ui.LightBox>}
 */
treesaver.ui.StateManager.getLightBoxes_ = function() {
  var lightboxes = [];

  treesaver.resources.findByClassName('lightbox').forEach(function(node) {
    var lightbox,
        requires = node.getAttribute('data-requires');

    if (requires && !treesaver.capabilities.check(requires.split(' '))) {
      // Doesn't meet our requirements, skip
      return;
    }

    treesaver.ui.StateManager.state_.chromeContainer.appendChild(node);

    lightbox = new treesaver.ui.LightBox(node);
    lightboxes.push(lightbox);

    treesaver.ui.StateManager.state_.chromeContainer.removeChild(node);
  });

  return lightboxes;
};

/**
 * Detect any changes in orientation, and update the viewport accordingly
 */
treesaver.ui.StateManager.onOrientationChange = function() {
  if (treesaver.ui.StateManager.state_.orientation === window['orientation']) {
    // Nothing to do (false alarm?)
    return;
  }

  // TODO: Fire event?
  //
  // TODO: Refactor this manual update
  treesaver.capabilities.updateClasses();

  treesaver.ui.StateManager.state_.orientation = window['orientation'];

  if (treesaver.ui.StateManager.state_.orientation % 180) {
    // Rotated (landscape)
    treesaver.ui.StateManager.state_.viewport.setAttribute('content',
      'width=device-height, height=device-width');
  }
  else {
    // Normal
    treesaver.ui.StateManager.state_.viewport.setAttribute('content',
      'width=device-width, height=device-height');
  }

  // Hide the address bar on the iPhone
  window.scrollTo(0, 1);

  // TODO: Update classes for styling?

  // TODO: Access widths to force layout?
};

/**
 * Gets the size currently visible within the browser
 *
 * @private
 * @return {{ w: number, h: number }}
 */
treesaver.ui.StateManager.getAvailableSize_ = function() {
  if (WITHIN_IOS_WRAPPER || !treesaver.boot.inContainedMode) {
    if (window.pageYOffset || window.pageXOffset) {
      window.scrollTo(0, 1);
    }

    // IE9+ and all other browsers
    if (!SUPPORT_IE || 'innerWidth' in window) {
      return {
        w: window.innerWidth,
        h: window.innerHeight
      };
    }
    else {
      // IE8-
      return {
        w: document.documentElement.clientWidth,
        h: document.documentElement.clientHeight
      };
    }
  }
  else {
    return treesaver.dimensions.getSize(treesaver.boot.tsContainer);
  }
};

/**
 * Get a lightbox for display
 *
 * @return {?treesaver.ui.LightBox}
 */
treesaver.ui.StateManager.getLightBox = function() {
  var availSize = treesaver.ui.StateManager.getAvailableSize_();

  return treesaver.ui.LightBox.select(treesaver.ui.StateManager.lightboxes_, availSize);
};

/**
 * Tick function
 */
treesaver.ui.StateManager.checkState = function() {
  var availSize = treesaver.ui.StateManager.getAvailableSize_(),
      newChrome;

  // Check if we're at a new size
  if (availSize.h !== treesaver.ui.StateManager.state_.size.h || availSize.w !== treesaver.ui.StateManager.state_.size.w) {
    treesaver.ui.StateManager.state_.size = availSize;

    // Check if chrome still fits
    if (!treesaver.ui.StateManager.state_.chrome ||
        !treesaver.ui.StateManager.state_.chrome.meetsRequirements() ||
        !treesaver.ui.StateManager.state_.chrome.fits(availSize)) {
      // Chrome doesn't fit, need to install a new one
      newChrome = treesaver.ui.Chrome.select(treesaver.ui.StateManager.chromes_, availSize);

      if (!newChrome) {
        // TODO: Fire chrome failed event
        // TODO: Show error page (no chrome)
        return;
      }

      // TODO: Fire chrome change event?
      // Remove existing chrome
      treesaver.dom.clearChildren(treesaver.ui.StateManager.state_.chromeContainer);
      // Deactivate previous
      if (treesaver.ui.StateManager.state_.chrome) {
        treesaver.ui.StateManager.state_.chrome.deactivate();
      }

      // Activate and store
      treesaver.ui.StateManager.state_.chromeContainer.appendChild(newChrome.activate());
      treesaver.ui.StateManager.state_.chrome = newChrome;
    }

    // Chrome handles page re-layout, if necessary
    treesaver.ui.StateManager.state_.chrome.setSize(availSize);
  }
};

// Expose special functions for use by the native app wrappers
if (WITHIN_IOS_WRAPPER) {
  // UI is shown/hidden based on the active and idle events fired by the
  // currently visible chrome.
  //
  // Since the next/prev, etc controls are contained within external UI,
  // need to expose functions that both go to next/prev and fire active
  //
  // Create a wrapper function that calls active on the current chrome
  // before calling the actual function
  var activeFunctionWrapper = function(f) {
    return (function() {
      // Manually call the chrome's function, if it exists
      if (treesaver.ui.StateManager.state_.chrome) {
        treesaver.ui.StateManager.state_.chrome.setUiActive_();
      }

      // Call original function
      f();
    });
  };

  goog.exportSymbol('treesaver.nextPage',
    activeFunctionWrapper(treesaver.ui.ArticleManager.nextPage));
  goog.exportSymbol('treesaver.previousPage',
    activeFunctionWrapper(treesaver.ui.ArticleManager.previousPage));
  goog.exportSymbol('treesaver.nextArticle',
    activeFunctionWrapper(treesaver.ui.ArticleManager.nextArticle));
  goog.exportSymbol('treesaver.previousArticle',
    activeFunctionWrapper(treesaver.ui.ArticleManager.previousArticle));
}
