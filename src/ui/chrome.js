/**
 * @fileoverview The chrome class.
 */

goog.provide('treesaver.ui.Chrome');

goog.require('treesaver.capabilities');
goog.require('treesaver.constants');
goog.require('treesaver.debug');
goog.require('treesaver.dimensions');
goog.require('treesaver.dom');
goog.require('treesaver.network');
goog.require('treesaver.scheduler');
goog.require('treesaver.ui.ArticleManager');
goog.require('treesaver.ui.Index');
goog.require('treesaver.ui.Scrollable');

/**
 * Chrome
 * @param {!Element} node HTML node.
 * @constructor
 */
treesaver.ui.Chrome = function(node) {
  // DEBUG-only validation checks
  if (goog.DEBUG) {
    if (!treesaver.dom.getElementsByClassName('viewer', node).length) {
      treesaver.debug.error('Chrome does not have a viewer');
    }

    if (node.parentNode.childNodes.length !== 1) {
      treesaver.debug.error('Chrome is not only child in container');
    }
  }

  /**
   * List of required capabilities for this Chrome
   * TODO: Only store mutable capabilities
   *
   * @type {?Array.<string>}
   */
  this.requirements = treesaver.dom.hasAttr(node, 'data-requires') ?
    node.getAttribute('data-requires').split(' ') : null;

  // Create DOM infrastructure for scrolling elements
  treesaver.dom.getElementsByClassName('scroll', node).
    forEach(treesaver.ui.Scrollable.initDom);

  /**
   * @type {Array.<Element>}
   */
  this.scrollers = [];

  /**
   * @type {?Element}
   */
  this.node = null;

  /**
   * @type {string}
   */
  this.html = node.parentNode.innerHTML;

  /**
   * The measurements of the chrome
   * @type {!treesaver.dimensions.Metrics}
   */
  this.size = new treesaver.dimensions.Metrics(node);

  // Clean up metrics object
  delete this.size.w;
  delete this.size.h;

  /**
   * The area available to pages (i.e. the size of the viewer)
   * @type {?treesaver.dimensions.Size}
   */
  this.pageArea = null;

  /**
   * @type {boolean}
   */
  this.active = false;

  /**
   * Cached reference to viewer DOM
   * @type {?Element}
   */
  this.viewer = null;

  /**
   * Cached reference to page width DOM
   * @type {?Array.<Element>}
   */
  this.pageWidth = null;

  /**
   * @type {?Array.<treesaver.layout.Page>}
   */
  this.pages = null;

  /**
   * Whether the UI is current in active state
   * @type {boolean}
   */
  this.uiActive = false;

  /**
   * Cached references to the menu TOC
   * @type {?Array.<Element>}
   */
  this.menus = [];

  /**
   * @type {boolean}
   */
  this.lightBoxActive = false;

  /**
   * @type {?treesaver.ui.LightBox}
   */
  this.lightBox = null;

  /**
   * @type {?Array.<Element>}
   */
  this.sidebars = null;

  /**
   * Cached reference to the next page DOM
   * @type {?Array.<Element>}
   */
  this.nextPage = null;

  /**
   * Cached reference to the next article DOM
   * @type {?Array.<Element>}
   */
  this.nextArticle = null;

  /**
   * Cached reference to the previous page DOM
   * @type {?Array.<Element>}
   */
  this.prevPage = null;

  /**
   * Cached reference to the previous article DOM
   * @type {?Array.<Element>}
   */
  this.prevArticle = null;

  /**
   * Cached references to the position templates elements
   * @type {?Array.<Element>}
   */
  this.positionElements = [];

  /**
   * Cached reference to the original position templates
   * @type {?Array.<string>}
   */
  this.positionTemplates = [];

  /**
   * Cached references to the index templates elements
   * @type {?Array.<Element>}
   */
  this.indexElements = [];

  /**
   * Cached reference to the original index templates
   * @type {?Array.<string>}
   */
  this.indexTemplates = [];
};

/**
 * @return {!Element} The activated node.
 */
treesaver.ui.Chrome.prototype.activate = function() {
  if (!this.active) {
    this.active = true;

    this.node = treesaver.dom.createElementFromHTML(this.html);
    // Store references to the portions of the UI we must update
    this.viewer = treesaver.dom.getElementsByClassName('viewer', this.node)[0];
    this.pageWidth = treesaver.dom.getElementsByClassName('pagewidth', this.node);
    this.nextPage = treesaver.dom.getElementsByClassName('next', this.node);
    this.nextArticle = treesaver.dom.getElementsByClassName('nextArticle', this.node);
    this.prevPage = treesaver.dom.getElementsByClassName('prev', this.node);
    this.prevArticle = treesaver.dom.getElementsByClassName('prevArticle', this.node);

    this.positionElements = treesaver.dom.getElementsByProperty('data-template', 'position', null, this.node);
    this.positionTemplates = this.positionElements.map(function (el) {
      return el.innerHTML;
    });

    this.indexElements = treesaver.dom.getElementsByProperty('data-template', 'index', null, this.node);
    this.indexTemplates = this.indexElements.map(function (el) {
      return el.innerHTML;
    });

    this.scrollers = treesaver.dom.getElementsByClassName('scroll', this.node).
      map(function(el) {
        return new treesaver.ui.Scrollable(el);
      });

    this.menus = treesaver.dom.getElementsByClassName('menu', this.node);
    this.sidebars = treesaver.dom.getElementsByClassName('sidebar', this.node);

    this.pages = [];

    // Setup event handlers
    treesaver.ui.Chrome.watchedEvents.forEach(function(evt) {
      treesaver.events.addListener(document, evt, this);
    }, this);

    // Always start off active
    this.uiActive = false; // Set to false to force event firing
    this.setUiActive_();
  }

  return /** @type {!Element} */ (this.node);
};

/**
 * Deactivate the chrome
 */
treesaver.ui.Chrome.prototype.deactivate = function() {
  if (!this.active) {
    return;
  }

  this.stopDelayedFunctions();
  this.active = false;

  // Remove event handlers
  treesaver.ui.Chrome.watchedEvents.forEach(function(evt) {
    treesaver.events.removeListener(document, evt, this);
  }, this);

  // Make sure to drop references
  this.node = null;
  this.viewer = null;
  this.pageWidth = null;
  this.menus = null;
  this.sidebars = null;
  this.nextPage = null;
  this.nextArticle = null;
  this.prevPage = null;
  this.prevArticle = null;
  this.positionElements = null;
  this.positionTemplates = null;
  this.indexElements = null;
  this.indexTemplates = null;

  // Deactivate pages
  this.pages.forEach(function(page) {
    if (page) {
      page.deactivate();
    }
  });
  this.pages = null;
  this.pageArea = null;
};

/**
 * Stop any delayed functions
 * @private
 */
treesaver.ui.Chrome.prototype.stopDelayedFunctions = function() {
  treesaver.scheduler.clear('selectPages');
  treesaver.scheduler.clear('animatePages');
};

/**
 * Events fired by Chrome objects
 *
 * @const
 * @type {!Object.<string, string>}
 */
treesaver.ui.Chrome.events = {
  ACTIVE: 'treesaver.active',
  IDLE: 'treesaver.idle'
};

/**
 * @type {Array.<string>}
 */
treesaver.ui.Chrome.watchedEvents = [
  treesaver.ui.Index.events.UPDATED,
  treesaver.ui.ArticleManager.events.PAGESCHANGED,
  treesaver.ui.ArticleManager.events.DOCUMENTCHANGED,
  'keydown',
  'click',
  'mousewheel',
  'DOMMouseScroll'
];

// Add touch events only if the browser supports touch
if (treesaver.capabilities.SUPPORTS_TOUCH) {
  // Note that we hook up all the event handlers immediately,
  // instead of waiting to do so during touchstart. This is
  // because removing the touch handlers causes Android 2.1
  // to stop sending all touch events
  treesaver.ui.Chrome.watchedEvents.push('touchstart', 'touchmove', 'touchend', 'touchcancel');
}
else {
  // Used for activity detection
  treesaver.ui.Chrome.watchedEvents.push('mouseover');
  // TODO: Move mousewheel in here as well?
}

/**
 * Event dispatcher for all events
 * @param {Event} e
 */
treesaver.ui.Chrome.prototype['handleEvent'] = function(e) {
  switch (e.type) {
  // Both these events mean that the pages we are displaying
  // (or trying to display) may have changed. Make sure to
  // fetch them again
  // Article changed and TOC changed will affect nav indicators
  case treesaver.ui.ArticleManager.events.PAGESCHANGED:
    return this.selectPagesDelayed();

  case treesaver.ui.Index.events.UPDATED:
    this.updateTOCDelayed();
    return this.selectPagesDelayed();

  case treesaver.ui.ArticleManager.events.DOCUMENTCHANGED:
    this.updateTOCActive();
    this.updatePosition();
    return;

  case 'mouseover':
    return this.mouseOver(e);

  case 'touchstart':
    return this.touchStart(e);

  case 'touchmove':
    return this.touchMove(e);

  case 'touchend':
    return this.touchEnd(e);

  case 'touchcancel':
    return this.touchCancel(e);

  case 'keydown':
    return this.keyDown(e);

  case 'click':
    return this.click(e);

  case 'mousewheel':
  case 'DOMMouseScroll':
    return this.mouseWheel(e);
  }
};

/**
 * Whether one of the control/shift/alt/etc keys were pressed at the time
 * of the event
 *
 * @private
 * @param {!Event} e
 * @return {boolean} True if at least one of those keys was pressed.
 */
treesaver.ui.Chrome.specialKeyPressed_ = function(e) {
  return e.ctrlKey || e.shiftKey || e.altKey || e.metaKey;
};

/**
 * Handle keyboard events
 * @param {!Event} e
 */
treesaver.ui.Chrome.prototype.keyDown = function(e) {
  // Lightbox active? Hide it
  if (this.lightBoxActive) {
    this.hideLightBox();

    // Stop default actions and return early
    e.preventDefault();
    return;
  }

  // Don't override keyboard commands
  if (!treesaver.ui.Chrome.specialKeyPressed_(e)) {
    switch (e.keyCode) {
    case 34: // PageUp
    case 39: // Right && down
    case 40:
    case 74: // j
    case 32: // Space
      treesaver.ui.ArticleManager.nextPage();
      break;

    case 33: // PageDown
    case 37: // Left & up
    case 38:
    case 75: // k
      treesaver.ui.ArticleManager.previousPage();
      break;

    case 72: // h
      treesaver.ui.ArticleManager.previousArticle();
      break;

    case 76: // l
      treesaver.ui.ArticleManager.nextArticle();
      break;

    default: // Let the event through if not handled
      return;
    }

    // Handled key always causes UI idle
    this.setUiIdle_();

    // Key handled, don't want any default actions
    e.preventDefault();
  }
};

/**
 * Handle click event
 * @param {!Event} e
 */
treesaver.ui.Chrome.prototype.click = function(e) {
  // Lightbox active? Hide it
  if (this.lightBoxActive) {
    this.hideLightBox();
    e.stopPropagation();
    e.preventDefault();
    return;
  }

  // Ignore if done with a modifier key (could be opening in new tab, etc)
  if (treesaver.ui.Chrome.specialKeyPressed_(e)) {
    return true;
  }

  // Ignore if it's not a left-click
  if ('which' in e && e.which !== 1 || e.button) {
    treesaver.debug.info('Click ignored due to non-left click');

    return;
  }

  var el = treesaver.ui.Chrome.findTarget_(e.target),
      url,
      withinCurrentPage = false,
      handled = false,
      withinSidebar = false,
      withinMenu = false,
      nearestSidebar = null;

  // If there are any menus active and the event target
  // is contained within one, we deactive it and set
  // withinMenu to true.
  this.menus.forEach(function (menu) {
    if (this.isMenuActive(menu)) {
      withinMenu = menu.contains(el);
      this.menuInactive(menu);
    }
  }, this);

  withinSidebar = this.sidebars.some(function(sidebar) {
    return sidebar.contains(el);
  });

  if (!withinSidebar) {
    this.sidebars.forEach(function(sidebar) {
      this.sidebarInactive(sidebar);
    }, this);
  }

  // Compiler cast
  el = /** @type {!Element} */ (el);

  // Check if the target is within one of the visible pages
  // TODO: Once we have variable numbers of pages, this code will
  // need to change
  if (this.pages[0] && this.pages[0].node.contains(el)) {
    treesaver.ui.ArticleManager.previousPage();

    handled = true;
  }
  else if (this.pages[2] && this.pages[2].node.contains(el)) {
    treesaver.ui.ArticleManager.nextPage();

    handled = true;
  }
  else {
    withinCurrentPage = this.pages[1] && this.pages[1].node.contains(el);

    // Go up the tree and see if there's anything we want to process
    while (!handled && el && el !== treesaver.boot.tsContainer) {
      if (!withinCurrentPage) {
        if (treesaver.dom.hasClass(el, 'prev')) {
          treesaver.ui.ArticleManager.previousPage();

          handled = true;
        }
        else if (treesaver.dom.hasClass(el, 'next')) {
          treesaver.ui.ArticleManager.nextPage();

          handled = true;
        }
        else if (treesaver.dom.hasClass(el, 'prevArticle')) {
          treesaver.ui.ArticleManager.previousArticle();

          handled = true;
        }
        else if (treesaver.dom.hasClass(el, 'nextArticle')) {
          treesaver.ui.ArticleManager.nextArticle();

          handled = true;
        }
        else if (treesaver.dom.hasClass(el, 'menu')) {
          if (!withinMenu) {
            this.menuActive(el);
          }
          handled = true;
        }
        else if (treesaver.dom.hasClass(el, 'sidebar') ||
                treesaver.dom.hasClass(el, 'open-sidebar')) {

          nearestSidebar = this.getNearestSidebar(el);

          if (nearestSidebar && !this.isSidebarActive(nearestSidebar)) {
            this.sidebarActive(nearestSidebar);
          }
          handled = true;
        }
        else if (treesaver.dom.hasClass(el, 'close-sidebar')) {
          nearestSidebar = this.getNearestSidebar(el);

          if (nearestSidebar && this.isSidebarActive(nearestSidebar)) {
            this.sidebarInactive(nearestSidebar);
            handled = true;
          }
        }
      }
      else if (treesaver.dom.hasClass(el, 'zoomable')) {
        // Counts as handling the event only if showing is successful
        handled = this.showLightBox(el);
      }

      // Check links last since they may be used as UI commands as well
      // Links can occur in-page or in the chrome
      // IE aliases the src property to read-only href on images
      if (!handled && el.href && el.nodeName.toLowerCase() !== 'img') {
        // Lightbox-flagged elements are skipped as processing goes up the chain
        // if a zoomable is found on the way up the tree, it will be handled. If
        // not, the link is navigated as-is
        if (el.getAttribute('target') === 'lightbox') {
          // Skip this element and process the parent zoomable
          el = /** @type {!Element} */ (el.parentNode);
          continue;
        }

        url = treesaver.network.absoluteURL(el.href);
        if (!treesaver.ui.ArticleManager.goToDocumentByURL(url)) {
          // The URL is not an article, let the navigation happen normally
          return;
        }

        handled = true;
      }

      el = /** @type {!Element} */ (el.parentNode);
    }
  }

  if (handled) {
    e.stopPropagation();
    e.preventDefault();
  }
};

/**
 * The last time a mousewheel event was received
 *
 * @private
 * @type {number}
 */
treesaver.ui.Chrome.prototype.lastMouseWheel_;

/**
 * Handle the mousewheel event
 * @param {!Event} e
 */
treesaver.ui.Chrome.prototype.mouseWheel = function(e) {
  if (treesaver.ui.Chrome.specialKeyPressed_(e)) {
    // Ignore if special key is down (user could be zooming)
    return true;
  }

  // Lightbox active? Hide it
  if (this.lightBoxActive) {
    this.hideLightBox();
    e.preventDefault();
    return;
  }

  var now = goog.now();

  if (this.lastMouseWheel_ &&
      (now - this.lastMouseWheel_ < MOUSE_WHEEL_INTERVAL)) {
    // Ignore if too frequent (magic mouse)
    return;
  }

  this.lastMouseWheel_ = now;

  // Firefox handles this differently than others
  // http://adomas.org/javascript-mouse-wheel/
  var delta = e.wheelDelta ? e.wheelDelta : e.detail ? -e.detail : 0,
      withinViewer = this.viewer.contains(treesaver.ui.Chrome.findTarget_(e.target));

  if (!delta || !withinViewer) {
    return;
  }

  // Handle the event
  e.preventDefault();
  e.stopPropagation();

  if (delta > 0) {
    treesaver.ui.ArticleManager.previousPage();
  }
  else {
    treesaver.ui.ArticleManager.nextPage();
  }

  // Mousewheel always deactivates UI
  this.setUiIdle_();
};

/**
 * Sanitize the event target, which can be a textNode in Safari
 *
 * @private
 * @param {?EventTarget} node
 * @return {!Element}
 */
treesaver.ui.Chrome.findTarget_ = function(node) {
  if (!node) {
    node = treesaver.boot.tsContainer;
  }
  else if (node.nodeType !== 1 && node.parentNode) {
    // Safari Bug that gives you textNode on events
    node = node.parentNode || treesaver.boot.tsContainer;
  }

  // Cast for compiler
  return /** @type {!Element} */ (node);
};

/**
 * @private
 * @type {Object}
 */
treesaver.ui.Chrome.prototype.touchData_;

/**
 * Handle the touchstart event
 * @param {!Event} e
 */
treesaver.ui.Chrome.prototype.touchStart = function(e) {
  if (!treesaver.boot.tsContainer.contains(treesaver.ui.Chrome.findTarget_(e.target))) {
    return;
  }

  // Do all the handling ourselves
  e.stopPropagation();
  e.preventDefault();

  // Lightbox active? Hide it
  if (this.lightBoxActive) {
    this.hideLightBox();
    return;
  }

  this.touchData_ = {
    startTime: goog.now(),
    deltaTime: 0,
    startX: e.touches[0].pageX,
    startY: e.touches[0].pageY,
    deltaX: 0,
    deltaY: 0,
    touchCount: e.touches.length
  };

  if (this.touchData_.touchCount === 2) {
    this.touchData_.startX2 = e.touches[1].pageX;
  }

  this.scrollers.forEach(function(s) {
    if (s.contains(treesaver.ui.Chrome.findTarget_(e.target))) {
      this.touchData_.scroller = s;
    }
  }, this);

  // Pause other work for better swipe performance
  treesaver.scheduler.pause([], 2 * SWIPE_TIME_LIMIT);
};

/**
 * Handle the touchmove event
 * @param {!Event} e
 */
treesaver.ui.Chrome.prototype.touchMove = function(e) {
  if (!this.touchData_) {
    // No touch info, nothing to do
    return;
  }

  // Do all the handling ourselves
  e.stopPropagation();
  e.preventDefault();

  this.touchData_.lastMove = goog.now();
  this.touchData_.lastX = e.touches[0].pageX;
  this.touchData_.lastY = e.touches[0].pageY;
  this.touchData_.deltaTime = this.touchData_.lastMove - this.touchData_.startTime;
  this.touchData_.deltaX = this.touchData_.lastX - this.touchData_.startX;
  this.touchData_.deltaY = this.touchData_.lastY - this.touchData_.startY;
  this.touchData_.touchCount = Math.min(e.touches.length, this.touchData_.touchCount);
  this.touchData_.swipe =
    // One-finger only
    this.touchData_.touchCount === 1 &&
    // Finger has to move far enough
    Math.abs(this.touchData_.deltaX) >= SWIPE_THRESHOLD;

  if (this.touchData_.scroller) {
    this.touchData_.scroller.setOffset(this.touchData_.deltaX, -this.touchData_.deltaY);
  }
  else if (this.touchData_.swipe) {
    this.pageOffset = this.touchData_.deltaX;
    this._updatePagePositions(true);
  }
  else if (this.pageOffset) {
    this.animationStart = goog.now();
    this._updatePagePositions(treesaver.capabilities.SUPPORTS_CSSTRANSITIONS);
  }
  else if (this.touchData_.touchCount === 2) {
    // Track second finger changes
    this.touchData_.deltaX2 = e.touches[1].pageX - this.touchData_.startX2;
  }
};

/**
 * Handle the touchend event
 * @param {!Event} e
 */
treesaver.ui.Chrome.prototype.touchEnd = function(e) {
  // Hold onto a reference before clearing
  var touchData = this.touchData_,
      // Flag to track whether we need to reset positons, etc
      actionTaken = false;

  // Clear out touch data
  this.touchCancel(e);

  if (!touchData) {
    // No touch info, nothing to do
    return;
  }

  // Do all the handling ourselves
  e.stopPropagation();
  e.preventDefault();

  if (touchData.scroller && touchData.lastMove) {
    touchData.scroller.setOffset(touchData.deltaX, -touchData.deltaY, true);
  }
  else if (touchData.touchCount === 1) {
    // No move means we create a click
    if (!touchData.lastMove) {
      // Lightbox is honorary viewer
      var target = treesaver.ui.Chrome.findTarget_(e.target),
          withinViewer = this.lightBoxActive || this.viewer.contains(target);

      // TODO: Currently this code is OK since the IE browsers don't support
      // touch. However, perhaps Windows Phone 7 will and needs a fix with
      // IE7? Need to integrate this into treesaver.events
      var evt = document.createEvent('MouseEvents');
      evt.initMouseEvent('click', true, true, e.view, 1,
          e.changedTouches[0].screenX, e.changedTouches[0].screenY,
          e.changedTouches[0].clientX, e.changedTouches[0].clientY,
          e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, 0, null);

      if (target.dispatchEvent(evt) && withinViewer) {
        // Event went unhandled, toggle active state
        this.toggleUiActive_();
      }
      else if (withinViewer) {
        // Handled event within viewer = idle
        this.setUiIdle_();
      }
      else {
        // Otherwise, active
        this.setUiActive_();
      }

      // Counts as handling
      actionTaken = true;
    }
    // Check for a swipe
    // Also allow for users to swipe down in order to go to next page. This is a
    // common mistake made when users first interact with a paged UI
    else if (touchData.swipe || touchData.deltaY <= -SWIPE_THRESHOLD) {
      if (touchData.swipe && touchData.deltaX > 0) {
        actionTaken = treesaver.ui.ArticleManager.previousPage();
      }
      else {
        actionTaken = treesaver.ui.ArticleManager.nextPage();
      }

      if (!actionTaken) {
        // Failed page turn = Show UI
        this.setUiActive_();
      }
      else {
        // Successful page turn = Hide UI
        this.setUiIdle_();
      }
    }
    else {
      // No swipe and no tap, do nothing
    }
  }
  else if (touchData.touchCount === 2) {
    // Two finger swipe in the same direction is next/previous article
    if (Math.abs(touchData.deltaX2) >= SWIPE_THRESHOLD) {
      if (touchData.deltaX < 0 && touchData.deltaX2 < 0) {
        actionTaken = treesaver.ui.ArticleManager.nextArticle();
      }
      else if (touchData.deltaX > 0 && touchData.deltaX2 > 0) {
        actionTaken = treesaver.ui.ArticleManager.previousArticle();
      }

      if (!actionTaken) {
        // Failed article change = Show UI
        this.setUiActive_();
      }
      else {
        // Success = Hide UI
        this.setUiIdle_();
      }
    }
  }

  // Reset page position, if applicable
  if (!actionTaken) {
    this.animationStart = goog.now();
    this.pageOffset = 0;
    this._updatePagePositions(treesaver.capabilities.SUPPORTS_CSSTRANSITIONS);
  }
};

/**
 * Handle the touchcancel event
 * @param {!Event} e
 */
treesaver.ui.Chrome.prototype.touchCancel = function(e) {
  // Let the tasks begin again
  treesaver.scheduler.resume();

  this.touchData_ = null;
};

/**
 * Desktop-only handler to make sure we don't hide UI when the user is trying
 * to use it
 * @param {!Event} e
 */
treesaver.ui.Chrome.prototype.mouseOver = function(e) {
  // Don't do anything on touch devices
  if (!e.touches) {
    // Need to make sure UI is visible if a user is trying to click on it
    this.setUiActive_();
  }
};

/**
 * Show hidden UI controls
 * @private
 */
treesaver.ui.Chrome.prototype.setUiActive_ = function() {
  // Don't fire events needlessly
  if (!this.uiActive) {
    this.uiActive = true;
    treesaver.dom.addClass(/** @type {!Element} */ (this.node), 'active');

    treesaver.events.fireEvent(document, treesaver.ui.Chrome.events.ACTIVE);
  }

  // Fire the idle event on a timer using debouncing, which delays
  // the function when receiving multiple calls
  treesaver.scheduler.debounce(
    this.setUiIdle_,
    UI_IDLE_INTERVAL,
    null,
    false,
    'idletimer',
    this
  );
};

/**
 * Hide UI controls
 * @private
 */
treesaver.ui.Chrome.prototype.setUiIdle_ = function() {
  // Don't fire events unless needed
  if (this.uiActive) {
    this.uiActive = false;
    treesaver.dom.removeClass(/** @type {!Element} */ (this.node), 'active');

    treesaver.events.fireEvent(document, treesaver.ui.Chrome.events.IDLE);
  }

  // Clear anything that might debounce
  treesaver.scheduler.clear('idletimer');
};

/**
 * Toggle Active state
 * @private
 */
treesaver.ui.Chrome.prototype.toggleUiActive_ = function() {
  if (!this.uiActive) {
    this.setUiActive_();
  }
  else {
    this.setUiIdle_();
  }
};

/**
 * Show menu
 */
treesaver.ui.Chrome.prototype.menuActive = function(menu) {
  treesaver.dom.addClass(/** @type {!Element} */ (menu), 'menu-active');
};

/**
 * Hide menu
 */
treesaver.ui.Chrome.prototype.menuInactive = function(menu) {
  treesaver.dom.removeClass(/** @type {!Element} */ (menu), 'menu-active');
};

/**
 * Returns the current state of the menu.
 */
treesaver.ui.Chrome.prototype.isMenuActive = function(menu) {
  return treesaver.dom.hasClass(/** @type {!Element} */ (menu), 'menu-active');
};

/**
 * Show sidebar
 */
treesaver.ui.Chrome.prototype.sidebarActive = function(sidebar) {
  treesaver.dom.addClass(/** @type {!Element} */ (sidebar), 'sidebar-active');
};

/**
 * Hide sidebar
 */
treesaver.ui.Chrome.prototype.sidebarInactive = function(sidebar) {
  treesaver.dom.removeClass(/** @type {!Element} */ (sidebar), 'sidebar-active');
};

/**
 * Determines whether or not the sidebar is active.
 *
 * @return {boolean} true if the sidebar is active, false otherwise.
 */
treesaver.ui.Chrome.prototype.isSidebarActive = function(sidebar) {
  return treesaver.dom.hasClass(/** @type {!Element} */ (sidebar), 'sidebar-active');
};

/**
 * Returns the nearest ancestor sidebar to the given element.
 * @return {?Element} The nearest ancestor sidebar or null.
 */
treesaver.ui.Chrome.prototype.getNearestSidebar = function(el) {
  var parent = el;

  if (treesaver.dom.hasClass(parent, 'sidebar')) {
    return parent;
  }

  while ((parent = parent.parentNode) !== null && parent.nodeType === 1) {
    if (treesaver.dom.hasClass(parent, 'sidebar')) {
      return parent;
    }
  }
  return null;
};

/**
 * Show lightbox
 *
 * @private
 * @param {!Element} el
 * @return {boolean} True if content can be shown.
 */
treesaver.ui.Chrome.prototype.showLightBox = function(el) {
  var figure = treesaver.ui.ArticleManager.getFigure(el);

  if (!figure) {
    return false;
  }

  // Hide toolbars, etc when showing lightbox
  this.setUiIdle_();

  if (!this.lightBoxActive) {
    this.lightBox = treesaver.ui.StateManager.getLightBox();
    if (!this.lightBox) {
      // No lightbox, nothing to show
      return false;
    }

    this.lightBoxActive = true;
    this.lightBox.activate();
    // Lightbox is a sibling of the chrome root
    this.node.parentNode.appendChild(this.lightBox.node);
  }

  // Closure compiler cast
  this.lightBox.node = /** @type {!Element} */ (this.lightBox.node);

  // Cover entire chrome with the lightbox
  treesaver.dimensions.setCssPx(this.lightBox.node, 'width', treesaver.dimensions.getOffsetWidth(this.node));
  treesaver.dimensions.setCssPx(this.lightBox.node, 'height', treesaver.dimensions.getOffsetHeight(this.node));

  if (!this.lightBox.showFigure(figure)) {
    // Showing failed
    this.hideLightBox();
    return false;
  }

  // Successfully showed the figure
  return true;
};

/**
 * Dismiss lightbox
 *
 * @private
 */
treesaver.ui.Chrome.prototype.hideLightBox = function() {
  if (this.lightBoxActive) {
    this.lightBoxActive = false;
    this.node.parentNode.removeChild(this.lightBox.node);
    this.lightBox.deactivate();
    this.lightBox = null;
  }
};

/**
 * @return {boolean} True if the Chrome meets current browser capabilities.
 */
treesaver.ui.Chrome.prototype.meetsRequirements = function() {
  if (!this.requirements) {
    return true;
  }

  return treesaver.capabilities.check(this.requirements, true);
};

/**
 * @param {treesaver.dimensions.Size} availSize
 * @return {boolean} True if fits.
 */
treesaver.ui.Chrome.prototype.fits = function(availSize) {
  return treesaver.dimensions.inSizeRange(this.size, availSize);
};

/**
 * @private
 * @return {treesaver.dimensions.Size}
 */
treesaver.ui.Chrome.prototype.calculatePageArea = function() {
  if (goog.DEBUG) {
    if (!this.viewer) {
      treesaver.debug.error('No viewer in chrome');
    }
  }

  this.pageArea = {
    w: treesaver.dimensions.getOffsetWidth(this.viewer),
    h: treesaver.dimensions.getOffsetHeight(this.viewer)
  };
};

/**
 * Sets the size of the chrome
 * @param {treesaver.dimensions.Size} availSize
 */
treesaver.ui.Chrome.prototype.setSize = function(availSize) {
  treesaver.dimensions.setCssPx(/** @type {!Element} */ (this.node), 'width', availSize.w);
  treesaver.dimensions.setCssPx(/** @type {!Element} */ (this.node), 'height', availSize.h);

  // Clear out previous value
  this.pageArea = null;

  // Update to our new page area
  this.calculatePageArea();

  // Refresh the size of scrollable areas
  this.scrollers.forEach(function(s) { s.refreshDimensions(); });

  if (treesaver.ui.ArticleManager.currentDocument) {
    // Re-query for pages later
    this.selectPagesDelayed();
    this.updateTOCDelayed();
  }
};

/**
 * Update the TOC's 'current' class.
 *
 * @private
 */
treesaver.ui.Chrome.prototype.updateTOCActive = function() {
  var currentUrl = treesaver.ui.ArticleManager.getCurrentUrl();

  this.indexElements.forEach(function (el) {
    var anchors = treesaver.dom.getElementsByProperty('href', null, 'a', el).filter(function (a) {
          // The anchors in the TOC may be relative URLs so we need to create absolute
          // ones when comparing to the currentUrl, which is always absolute.
          return treesaver.network.absoluteURL(a.href) === currentUrl;
        }),
        children = [];

    if (anchors.length) {
      children = treesaver.array.toArray(el.children);

      children.forEach(function (c) {
        var containsUrl = anchors.some(function (a) {
             return c.contains(a);
            });

        if (containsUrl) {
          treesaver.dom.addClass(c, 'current');
        } else {
          treesaver.dom.removeClass(c, 'current');
        }
      });
    }
  });

  // Refresh the size of scrollable areas (often used with TOC)
  // TODO: Figure out better separate here?
  this.scrollers.forEach(function(s) { s.refreshDimensions(); });
};

treesaver.ui.Chrome.prototype.updatePosition = function () {
  this.positionElements.forEach(function (el, i) {
    var template = this.positionTemplates[i];

    el.innerHTML = Mustache.to_html(template, {
      pagenumber: treesaver.ui.ArticleManager.getCurrentPageNumber(),
      pagecount: treesaver.ui.ArticleManager.getCurrentPageCount(),
      url: treesaver.ui.ArticleManager.getCurrentUrl(),
      documentnumber: treesaver.ui.ArticleManager.getCurrentDocumentNumber(),
      documentcount: treesaver.ui.ArticleManager.getDocumentCount()
    });
  }, this);
};

/**
 * Update the width of elements bound to the page width
 * @private
 */
treesaver.ui.Chrome.prototype.updatePageWidth = function(width) {
  if (width) {
    this.pageWidth.forEach(function(el) {
      treesaver.dimensions.setCssPx(el, 'width', width);
    }, this);
  }
};

/**
 * Set the element state to enabled or disabled. If the element
 * is a button its disabled attribute will be set to true. Otherwise
 * the element will receive a class="disabled".
 *
 * @private
 * @param {!Element} el The element to set the state for.
 * @param {!boolean} enable True to enable the element, false to disable it.
 */
treesaver.ui.Chrome.prototype.setElementState = function(el, enable) {
  if (el.nodeName === 'BUTTON') {
    el.disabled = !enable;
  }
  else {
    if (enable) {
      treesaver.dom.removeClass(el, 'disabled');
    }
    else {
      treesaver.dom.addClass(el, 'disabled');
    }
  }
};

/**
 * Update the state of the next page elements.
 * @private
 */
treesaver.ui.Chrome.prototype.updateNextPageState = function() {
  if (this.nextPage) {
    var canGoToNextPage = treesaver.ui.ArticleManager.canGoToNextPage();

    this.nextPage.forEach(function(el) {
      this.setElementState(el, canGoToNextPage);
    }, this);
  }
};

/**
 * Update the state of the next article elements.
 * @private
 */
treesaver.ui.Chrome.prototype.updateNextArticleState = function() {
  if (this.nextArticle) {
    var canGoToNextArticle = treesaver.ui.ArticleManager.canGoToNextArticle();

    this.nextArticle.forEach(function(el) {
      this.setElementState(el, canGoToNextArticle);
    }, this);
  }
};

/**
 * Update the state of the previous page elements.
 * @private
 */
treesaver.ui.Chrome.prototype.updatePreviousPageState = function() {
  if (this.prevPage) {
    var canGoToPreviousPage = treesaver.ui.ArticleManager.canGoToPreviousPage();

    this.prevPage.forEach(function(el) {
      this.setElementState(el, canGoToPreviousPage);
    }, this);
  }
};

/**
 * Update the state of the previous article elements.
 * @private
 */
treesaver.ui.Chrome.prototype.updatePreviousArticleState = function() {
  if (this.prevArticle) {
    var canGoToPreviousArticle = treesaver.ui.ArticleManager.canGoToPreviousArticle();

    this.prevArticle.forEach(function(el) {
      this.setElementState(el, canGoToPreviousArticle);
    }, this);
  }
};

/**
 * Run selectPages on a delay
 * @private
 */
treesaver.ui.Chrome.prototype.selectPagesDelayed = function() {
  treesaver.scheduler.queue(this.selectPages, [], 'selectPages', this);
};

/**
 * Run updateTOC on a delay
 * @private
 */
treesaver.ui.Chrome.prototype.updateTOCDelayed = function() {
  treesaver.scheduler.queue(this.updateTOC, [], 'updateTOC', this);
};

/**
 * Manages the page objects needed in order to display content,
 * including DOM insertion
 * @private
 */
treesaver.ui.Chrome.prototype.selectPages = function() {
  this.stopDelayedFunctions();

  // Save the direction
  var direction = treesaver.ui.ArticleManager.getCurrentTransitionDirection();

  // Populate the pages
  this.populatePages(direction);

  // Call layout even if pages didn't change since viewport size
  // can affect page positioning
  this.layoutPages(direction);

  // Update our field display in the chrome (page count/index changes)
  this.updatePosition();
  this.updatePageWidth(treesaver.ui.ArticleManager.getCurrentPageWidth());

  // Update the previous/next buttons depending on the current state
  this.updateNextPageState();
  this.updateNextArticleState();
  this.updatePreviousPageState();
  this.updatePreviousArticleState();
};

/**
 * Manages the TOC.
 * @private
 */
treesaver.ui.Chrome.prototype.updateTOC = function() {
  // Stop any running TOC updates
  treesaver.scheduler.clear('updateTOC');

  var toc = {
    children: treesaver.ui.ArticleManager.index.children.map(function (child) {
      return child.meta;
    })
  };

  this.indexElements.forEach(function (el, i) {
    var template = this.indexTemplates[i];

    el.innerHTML = Mustache.to_html(template, toc);
  }, this);

  this.updateTOCActive();
};

/**
 * Populates the pages array for layout
 *
 * @private
 * @param {number} direction The direction to animate any transition.
 */
treesaver.ui.Chrome.prototype.populatePages = function(direction) {
  var old_pages = this.pages;

  // TODO: Master page width?
  this.pages = treesaver.ui.ArticleManager.getPages(/** @type {!treesaver.dimensions.Size} */ (this.pageArea), 1);

  old_pages.forEach(function(page) {
    // Only deactivate pages we're not about to use again
    if (page) {
      if (this.pages.indexOf(page) === -1) {
        if (page.node && page.node.parentNode === this.viewer) {
          this.viewer.removeChild(page.node);
        }
        page.deactivate();
      }
    }
  }, this);

  this.pages.forEach(function(page, i) {
    if (page) {
      if (!page.node) {
        page.activate();
      }

      if (page.node.parentNode !== this.viewer) {
        if (direction === treesaver.ui.ArticleManager.transitionDirection.BACKWARD) {
          this.viewer.insertBefore(page.node, this.viewer.firstChild);
        }
        else {
          this.viewer.appendChild(page.node);
        }
      }
    }
  }, this);
};

/**
 * Positions the current visible pages
 * @param {number} direction The direction to animate any transition.
 */
treesaver.ui.Chrome.prototype.layoutPages = function(direction) {
  // For now, hard coded to show up to three pages, in the prev/current/next
  // configuration
  //
  // Note, that a page may be null, and won't have a corresponding DOM entry
  // (later, it might have a loading/placeholder page)
  var prevPage = this.pages[0],
      currentPage = this.pages[1],
      nextPage = this.pages[2],
      leftMarginEdge,
      rightMarginEdge,
      leftMargin = Math.max(currentPage.size.marginRight, nextPage ? nextPage.size.marginLeft : 0),
      rightMargin = Math.max(currentPage.size.marginLeft, prevPage ? prevPage.size.marginRight : 0),
      oldOffset = this.pageOffset;

  // Mark the master page
  currentPage.node.setAttribute('id', 'currentPage');

  // Center the first page
  leftMarginEdge = (this.pageArea.w - currentPage.size.outerW) / 2 - leftMargin;
  rightMarginEdge = leftMarginEdge + currentPage.size.outerW + leftMargin + rightMargin;

  // Register the positions of each page
  this.pagePositions = [];
  this.pagePositions[1] = leftMarginEdge;

  if (prevPage) {
    this.pagePositions[0] = leftMarginEdge -
      (prevPage.size.outerW + prevPage.size.marginLeft);
    prevPage.node.setAttribute('id', 'previousPage');
  }

  if (nextPage) {
    this.pagePositions[2] = rightMarginEdge - nextPage.size.marginLeft;
    nextPage.node.setAttribute('id', 'nextPage');
  }

  // Calculate any page offsets to use in animation
  if (direction !== treesaver.ui.ArticleManager.transitionDirection.NEUTRAL) {
    this.animationStart = goog.now();

    if (direction === treesaver.ui.ArticleManager.transitionDirection.BACKWARD) {
      this.pageOffset = nextPage ?
          (this.pagePositions[1] - this.pagePositions[2]) : 0;

      // We might have a previous offset from the page swipe that puts,
      // us closer to the final destination
      if (oldOffset) {
        this.pageOffset += oldOffset;
      }
    }
    else {
      this.pageOffset = prevPage ?
        (this.pagePositions[1] - this.pagePositions[0]) : 0;

      // We might have a previous offset from the page swipe that puts,
      // us closer to the final destination
      if (oldOffset) {
        this.pageOffset += oldOffset;
      }
    }
  }
  else if (!this.pageOffset) {
    // Can't let pageOffset be undefined, will throw errors in IE
    this.pageOffset = 0;
  }

  if (treesaver.capabilities.SUPPORTS_CSSTRANSITIONS && this.pageOffset) {
    this.pageOffset = 0;
  }

  this._updatePagePositions(treesaver.capabilities.SUPPORTS_CSSTRANSITIONS);
};

/**
 * Run updatePagePositions on a delay
 * @private
 */
treesaver.ui.Chrome.prototype._updatePagePositionsDelayed = function() {
  treesaver.scheduler.queue(this.selectPages, [], 'animatePages', this);
};

/**
 * @private
 * @param {boolean=} preventAnimation
 */
treesaver.ui.Chrome.prototype._updatePagePositions = function(preventAnimation) {
  var offset = this.pageOffset;

  if (!preventAnimation) {
    // Pause tasks to keep animation smooth
    treesaver.scheduler.pause(['animatePages'], 2 * MAX_ANIMATION_DURATION);

    var now = goog.now(),
        percentRemaining = !preventAnimation ?
          Math.max(0, (this.animationStart || 0) +
            MAX_ANIMATION_DURATION - now) / MAX_ANIMATION_DURATION :
          1,
        ratio = -Math.cos(percentRemaining * Math.PI) / 2 + 0.5;

    offset *= ratio;

    if (Math.abs(offset) < 5) {
      this.pageOffset = offset = 0;
      // Re-enable other tasks
      treesaver.scheduler.resume();
    }
    else {
      // Queue up another call in a bit
      this._updatePagePositionsDelayed();
    }
  }

  // Update position
  this.pages.forEach(function(page, i) {
    if (page && page.node) {
      treesaver.dimensions.setOffsetX(page.node, this.pagePositions[i] + offset);
    }
  }, this);
};

/**
 * Find the first chrome that meets the current requirements
 *
 * @param {Array.<treesaver.ui.Chrome>} chromes
 * @param {treesaver.dimensions.Size} availSize
 * @return {?treesaver.ui.Chrome} A suitable Chrome, if one was found.
 */
treesaver.ui.Chrome.select = function(chromes, availSize) {
  // Cycle through chromes
  var i, len, current, chrome = null;

  for (i = 0, len = chromes.length; i < len; i += 1) {
    current = chromes[i];
    if (current.meetsRequirements() && current.fits(availSize)) {
      chrome = current;
      break;
    }
  }

  if (!chrome) {
    treesaver.debug.error('No Chrome Fits!');
  }

  return chrome;
};

if (goog.DEBUG) {
  // Expose for testing
  treesaver.ui.Chrome.prototype.toString = function() {
    return '[Chrome: ]';
  };
}
