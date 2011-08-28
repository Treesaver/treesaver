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
    if (!treesaver.dom.querySelectorAll('.viewer', node).length) {
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
  treesaver.ui.Scrollable.initDomTree(node);

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

  /**
   * Cached references to the current-document template elements
   * @type {?Array.<Element>}
   */
  this.currentDocumentElements = [];

  /**
   * Cached reference to the original current-document templates
   * @type {?Array.<string>}
   */
  this.currentDocumentTemplates = [];

  /**
   * Cached references to the publication template elements
   * @type {?Array.<Element>}
   */
  this.publicationElements = [];

  /**
   * Cached reference to the original publication templates
   * @type {?Array.<string>}
   */
  this.publicationTemplates = [];
};

/**
 * @return {!Element} The activated node.
 */
treesaver.ui.Chrome.prototype.activate = function() {
  if (!this.active) {
    this.active = true;

    this.node = treesaver.dom.createElementFromHTML(this.html);
    // Store references to the portions of the UI we must update
    this.viewer = treesaver.dom.querySelectorAll('.viewer', this.node)[0];
    this.pageWidth = treesaver.dom.querySelectorAll('.pagewidth', this.node);
    this.nextPage = treesaver.dom.querySelectorAll('.next', this.node);
    this.nextArticle = treesaver.dom.querySelectorAll('.nextArticle', this.node);
    this.prevPage = treesaver.dom.querySelectorAll('.prev', this.node);
    this.prevArticle = treesaver.dom.querySelectorAll('.prevArticle', this.node);

    this.positionElements = [];
    this.positionTemplates = [];
    this.indexElements = [];
    this.indexTemplates = [];
    this.currentDocumentElements = [];
    this.currentDocumentTemplates = [];
    this.publicationElements = [];
    this.publicationTemplates = [];

    treesaver.dom.querySelectorAll('[' + treesaver.dom.customAttributePrefix + 'template]', this.node).forEach(function(el) {
      var template_name = treesaver.dom.getCustomAttr(el, 'template'),
          elementArray, templateArray;

      switch(template_name) {
      case 'position':
        elementArray = this.positionElements;
        templateArray = this.positionTemplates;
        break;
      case 'index':
        elementArray = this.indexElements;
        templateArray = this.indexTemplates;
        break;
      case 'currentdocument':
        elementArray = this.currentDocumentElements;
        templateArray = this.currentDocumentTemplates;
        break;
      case 'publication':
        elementArray = this.publicationElements;
        templateArray = this.publicationTemplates;
        break;
      default: // Unknown template
        return;
      }

      // Add
      elementArray.push(el);
      templateArray.push(el.innerHTML);
    }, this);

    this.menus = treesaver.dom.querySelectorAll('.menu', this.node);
    this.sidebars = treesaver.dom.querySelectorAll('.sidebar', this.node);

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
  this.currentDocumentElements = null;
  this.currentDocumentTemplates = null;
  this.publicationElements = null;
  this.publicationTemplates = null;

  // Deactivate pages
  this.pages.forEach(function(page) {
    if (page) {
      page.deactivate();
    }
  });
  this.pages = null;
  this.pageArea = null;

  // Clear out tasks
  treesaver.scheduler.clear('idletimer');
  treesaver.scheduler.clear('updateTOC');
  this.stopDelayedFunctions();
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
  IDLE: 'treesaver.idle',
  SIDEBARACTIVE: 'treesaver.sidebaractive',
  SIDEBARINACTIVE: 'treesaver.sidebarinactive'
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
      this.nextPage_();
      break;

    case 33: // PageDown
    case 37: // Left & up
    case 38:
    case 75: // k
      this.previousPage_();
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
      ancestor,
      url,
      withinCurrentPage = false,
      handled = false,
      withinSidebar = false,
      withinMenu = false,
      nearestSidebar = null;

  // Lightbox active? Hide it
  if (this.lightBoxActive) {
    // Check if click was within lighbox
    // TODO: FIXME
    if (this.lightBox.node.contains(el)) {
      if (el.nodeName === 'A') {
        ancestor = el;
      }
      else {
        ancestor = treesaver.dom.getAncestor(el, 'A');
      }

      // Was it a link?
      if (ancestor && ancestor.href) {
        url = treesaver.network.absoluteURL(ancestor.href);
        // Try to go to the article
        if (!treesaver.ui.ArticleManager.goToDocumentByURL(url)) {
          // The URL is not an article, let the navigation happen normally
          return;
        }
      }
    }

    // Close the lightbox no matter what
    this.hideLightBox();
    e.stopPropagation();
    e.preventDefault();
    return;
  }

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
    this.previousPage_();

    handled = true;
  }
  else if (this.pages[2] && this.pages[2].node.contains(el)) {
    this.nextPage_();

    handled = true;
  }
  else {
    withinCurrentPage = this.pages[1] && this.pages[1].node.contains(el);

    // Go up the tree and see if there's anything we want to process
    while (!handled && el && el !== treesaver.tsContainer) {
      if (!withinCurrentPage) {
        if (treesaver.dom.hasClass(el, 'prev')) {
          this.previousPage_();

          handled = true;
        }
        else if (treesaver.dom.hasClass(el, 'next')) {
          this.nextPage_();

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
                 treesaver.dom.hasClass(el, 'open-sidebar') ||
                 treesaver.dom.hasClass(el, 'toggle-sidebar') ||
                 treesaver.dom.hasClass(el, 'close-sidebar')) {

          if ((nearestSidebar = this.getNearestSidebar(el))) {
            if (treesaver.dom.hasClass(el, 'sidebar') || treesaver.dom.hasClass(el, 'open-sidebar')) {
              this.sidebarActive(nearestSidebar);
            }
            else if (treesaver.dom.hasClass(el, 'toggle-sidebar')) {
              this.sidebarToggle(nearestSidebar);
            }
            else {
              this.sidebarInactive(nearestSidebar);
            }

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
      if (!handled && el.href) {
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

  var target = treesaver.ui.Chrome.findTarget_(e.target);

  // Is the mousewheel within a scrolling element? If so, ignore
  if (this.isWithinScroller_(target)) {
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
    this.previousPage_();
  }
  else {
    this.nextPage_();
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
    node = treesaver.tsContainer;
  }
  else if (node.nodeType !== 1 && node.parentNode) {
    // Safari Bug that gives you textNode on events
    node = node.parentNode || treesaver.tsContainer;
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
  var target = treesaver.ui.Chrome.findTarget_(e.target),
      scroller = this.isWithinScroller_(target),
      withinViewer, node, id,
      x, y, now;

  if (!treesaver.tsContainer.contains(treesaver.ui.Chrome.findTarget_(e.target))) {
    return;
  }

  // Do all the handling ourselves
  e.stopPropagation();
  e.preventDefault();

  // Lightbox active? Hide it only if it can't scroll
  if (this.lightBoxActive && !scroller) {
    this.hideLightBox();
    return;
  }

  // Ignore scrollers in prev/next page
  if (scroller) {
    node = scroller;
    while (node) {
      id = node.id;

      if (id === 'prevPage' || id === 'nextPage') {
        scroller = node = null;
        break;
      }

      node = node.parentNode;
    }
  }

  withinViewer = this.viewer.contains(target);

  x = e.touches[0].pageX;
  y = e.touches[0].pageY;
  now = goog.now();

  this.touchData_ = {
    startX: x,
    startY: y,
    startTime: now,
    lastX: x,
    lastY: y,
    lastTime: now,
    deltaX: 0,
    deltaY: 0,
    deltaTime: 0,
    totalX: 0,
    totalY: 0,
    totalTime: 0,
    touchCount: e.touches.length,
    withinViewer: withinViewer,
    scroller: scroller,
    canScrollHorizontally: scroller && treesaver.ui.Scrollable.canScrollHorizontally(scroller)
  };

  if (this.touchData_.touchCount === 2) {
    this.touchData_.startX2 = e.touches[1].pageX;
  }

  // Pause other work for better swipe performance
  treesaver.scheduler.pause([], 2 * SWIPE_TIME_LIMIT);
};

/**
 * Handle the touchmove event
 * @param {!Event} e
 */
treesaver.ui.Chrome.prototype.touchMove = function(e) {
  var touchData = this.touchData_,
      now, x, y;

  if (!touchData) {
    // No touch info, nothing to do
    return;
  }

  // Do all the handling ourselves
  e.stopPropagation();
  e.preventDefault();

  now = goog.now();
  x = e.touches[0].pageX;
  y = e.touches[0].pageY;

  touchData.deltaTime = touchData.lastMove - now;
  touchData.deltaX = x - touchData.lastX;
  touchData.deltaY = y - touchData.lastY;
  touchData.lastMove = now;
  touchData.lastX = e.touches[0].pageX;
  touchData.lastY = e.touches[0].pageY;
  touchData.totalTime += touchData.deltaTime;
  touchData.totalX += touchData.deltaX;
  touchData.totalY += touchData.deltaY;
  touchData.touchCount = Math.min(e.touches.length, touchData.touchCount);
  touchData.swipe =
    // One-finger only
    touchData.touchCount === 1 &&
    // Finger has to move far enough
    Math.abs(touchData.totalX) >= SWIPE_THRESHOLD &&
    // But not too vertical
    Math.abs(touchData.totalX) * 2 > Math.abs(touchData.totalY);

  if (touchData.scroller && (touchData.didScroll ||
      (touchData.canScrollHorizontally || !touchData.swipe))) {
    touchData.didScroll = touchData.didScroll || touchData.canScrollHorizontally ||
      Math.abs(touchData.totalY) >= SWIPE_THRESHOLD;
    treesaver.ui.Scrollable.setOffset(touchData.scroller, -touchData.deltaX, -touchData.deltaY);

    if (!touchData.withinViewer) {
      // Scrolling outside viewer means active, in case of long scroll
      this.setUiActive_();
    }
  }
  else if (touchData.touchCount === 2) {
    // Track second finger changes
    touchData.totalX2 = e.touches[1].pageX - touchData.startX2;
  }
  else {
    this.pageOffset = touchData.totalX;
    this._updatePagePositions(true);
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
      actionTaken = false,
      target = treesaver.ui.Chrome.findTarget_(e.target),
      // Lightbox is an honorary viewer
      withinViewer = this.lightBoxActive || this.viewer.contains(target);

  // Clear out touch data
  this.touchCancel(e);

  if (!touchData) {
    // No touch info, nothing to do
    return;
  }

  // Do all the handling ourselves
  e.stopPropagation();
  e.preventDefault();

  if (touchData.didScroll) {
    if (withinViewer) {
      // Scrolling in viewer means idle
      this.setUiIdle_();
    }
    else {
      // Scrolling within the chrome should keep UI active
      this.setUiActive_();
    }
  }
  else if (touchData.touchCount === 1) {
    // No move means we create a click
    if (!touchData.lastMove) {
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
    else if (touchData.swipe) {
      if (touchData.totalX > 0) {
        actionTaken = this.previousPage_();
      }
      else {
        actionTaken = this.nextPage_();
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
    if (Math.abs(touchData.totalX2) >= SWIPE_THRESHOLD) {
      if (touchData.totalX < 0 && touchData.totalX2 < 0) {
        actionTaken = treesaver.ui.ArticleManager.nextArticle();
      }
      else if (touchData.totalX > 0 && touchData.totalX2 > 0) {
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
    this._updatePagePositions();
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
 * Checks if the element is within one of our scrollable elements
 * @private
 * @param {!Element} el
 * @returns {?Element}
 */
treesaver.ui.Chrome.prototype.isWithinScroller_ = function(el) {
  var node = el;

  while (node) {
    if (treesaver.dom.hasClass(node, 'scroll')) {
        return node;
    }
    node = /** @type {?Element} */ (node.parentNode);
  }
};

/**
 * Go to the previous page
 *
 * @private
 */
treesaver.ui.Chrome.prototype.previousPage_ = function() {
  if (treesaver.ui.ArticleManager.canGoToPreviousPage()) {
    // Adjust the offset immediately for animation
    this.layoutPages(-1);

    // Now change the page in the article manager, etc
    return treesaver.ui.ArticleManager.previousPage();
  }
};

/**
 * Go to the next page
 *
 * @private
 */
treesaver.ui.Chrome.prototype.nextPage_ = function() {
  if (treesaver.ui.ArticleManager.canGoToNextPage()) {
    // Adjust the offset immediately for animation
    this.layoutPages(1);

    // Now change the page in the article manager, etc
    return treesaver.ui.ArticleManager.nextPage();
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
  treesaver.events.fireEvent(document, treesaver.ui.Chrome.events.SIDEBARACTIVE, {
    sidebar: sidebar
  });
  treesaver.dom.addClass(/** @type {!Element} */ (sidebar), 'sidebar-active');
};

/**
 * Hide sidebar
 */
treesaver.ui.Chrome.prototype.sidebarInactive = function(sidebar) {
  if (this.isSidebarActive(sidebar)) {
    treesaver.events.fireEvent(document, treesaver.ui.Chrome.events.SIDEBARINACTIVE, {
      sidebar: sidebar
    });
  }
  treesaver.dom.removeClass(/** @type {!Element} */ (sidebar), 'sidebar-active');
};

/**
 * Toggle sidebar state
 */
treesaver.ui.Chrome.prototype.sidebarToggle = function(sidebar) {
  if (this.isSidebarActive(sidebar)) {
    this.sidebarInactive(sidebar);
  }
  else {
    this.sidebarActive(sidebar);
  }
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
    var anchors = treesaver.dom.querySelectorAll('a[href]', el).filter(function (a) {
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
};

treesaver.ui.Chrome.prototype.updatePosition = function () {
  this.positionElements.forEach(function (el, i) {
    var template = this.positionTemplates[i];

    el.innerHTML = Mustache.to_html(template, {
      'pagenumber': treesaver.ui.ArticleManager.getCurrentPageNumber(),
      'pagecount': treesaver.ui.ArticleManager.getCurrentPageCount(),
      'url': treesaver.ui.ArticleManager.getCurrentUrl(),
      'documentnumber': treesaver.ui.ArticleManager.getCurrentDocumentNumber(),
      'documentcount': treesaver.ui.ArticleManager.getDocumentCount()
    });
  }, this);
};

treesaver.ui.Chrome.prototype.updatePublication = function () {
  this.publicationElements.forEach(function (el, i) {
    var template = this.publicationTemplates[i];

    el.innerHTML = Mustache.to_html(template, treesaver.ui.ArticleManager.index.meta);
  }, this);
};

treesaver.ui.Chrome.prototype.updateCurrentDocument = function () {
  this.currentDocumentElements.forEach(function (el, i) {
    var template = this.currentDocumentTemplates[i];

    el.innerHTML = Mustache.to_html(template, treesaver.ui.ArticleManager.getCurrentDocument().meta);
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

  // Populate the pages
  this.populatePages();

  // Call layout even if pages didn't change since viewport size
  // can affect page positioning
  this.layoutPages();

  // Update our field display in the chrome (page count/index changes)
  this.updatePosition();
  this.updateCurrentDocument();
  this.updatePublication();
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
    contents: treesaver.ui.ArticleManager.index.contents.map(function (child) {
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
 */
treesaver.ui.Chrome.prototype.populatePages = function() {
  var old_pages = this.pages;

  // TODO: Master page width?
  this.pages = treesaver.ui.ArticleManager.getPages(/** @type {!treesaver.dimensions.Size} */ (this.pageArea), 1);

  old_pages.forEach(function(page) {
    // Only deactivate pages we're not about to use again
    if (page) {
      var node = page.node;
      if (this.pages.indexOf(page) === -1) {
        // Deactivate before disconnecting from DOM tree
        page.deactivate();

        if (node && node.parentNode === this.viewer) {
          this.viewer.removeChild(node);
        }
      }
    }
  }, this);

  this.pages.forEach(function(page, i) {
    if (page) {
      var node = page.node || page.activate();

      // Is it in the viewer already?
      if (!node.parentNode) {
        // Insert into the tree, but make sure we display in the correct order
        this.viewer.appendChild(node);
      }

      node.setAttribute('id',
        i === 0 ? 'previousPage' : i ===1 ? 'currentPage' : 'nextPage');
    }
  }, this);
};

/**
 * Positions the current visible pages
 * @param {number=} pageShift
 */
treesaver.ui.Chrome.prototype.layoutPages = function(pageShift) {
  // For now, hard coded to show up to three pages, in the prev/current/next
  // configuration
  //
  // Note, that a page may be null, and won't have a corresponding DOM entry
  // (later, it might have a loading/placeholder page)
  var prevPage = this.pages[0],
      currentPage = this.pages[1],
      nextPage = this.pages[2],
      leftMargin, rightMargin,
      halfPageWidth = currentPage.size.outerW/2,
      oldOffset = this.pageOffset;

  // Register the positions of each page
  // The main page is dead centered via CSS absolute positioning, so no work
  // needs to be done
  this.pagePositions = [0, 0, 0];

  if (prevPage) {
    leftMargin = Math.max(currentPage.size.marginLeft, prevPage.size.marginRight);
    // Positioned to the left of the main page
    this.pagePositions[0] = -(halfPageWidth + leftMargin + prevPage.size.outerW/2);
  }

  if (nextPage) {
    rightMargin = Math.max(currentPage.size.marginRight, nextPage.size.marginLeft);
    // Positioned to the right of the main page
    this.pagePositions[2] = halfPageWidth + rightMargin + nextPage.size.outerW/2;
  }

  // TODO: Be much smarter about this
  if (pageShift) {
    if (pageShift > 0) {
      currentPage.node.setAttribute('id', 'nextPage');

      // Shift everything to the left, making the next page the center
      if (nextPage) {
        pageShift = -this.pagePositions[2];
        nextPage.node.setAttribute('id', 'currentPage');
      }
      else {
        // We don't know how large the next page will be, so guess it's the same
        // as the current page
        pageShift = -(currentPage.size.outerW + currentPage.size.marginRight);
      }
    }
    else {
      currentPage.node.setAttribute('id', 'previousPage');

      // Shift everything to the right, making the previous page the center
      if (prevPage) {
        pageShift = -this.pagePositions[0];
        prevPage.node.setAttribute('id', 'currentPage');
      }
      else {
        // Don't know how large previous page will be, guess same as current
        pageShift = currentPage.size.outerW + currentPage.size.marginLeft;
      }
    }

    this.pagePositions = this.pagePositions.map(function(value) {
      return value + pageShift;
    });

    this.animationStart = goog.now();
    // Account for any existing offset, and keep page in same position when
    // animation starts
    this.pageOffset -= pageShift;
  }
  else {
    // Can't let pageOffset be undefined, will throw errors in IE
    this.pageOffset = this.pageOffset || 0;
  }

  this._updatePagePositions();
};

/**
 * Run updatePagePositions on a delay
 * @private
 */
treesaver.ui.Chrome.prototype._updatePagePositionsDelayed = function() {
  treesaver.scheduler.queue(this._updatePagePositions, [], 'animatePages', this);
};

/**
 * @private
 * @param {boolean=} preventAnimation
 */
treesaver.ui.Chrome.prototype._updatePagePositions = function(preventAnimation) {
  if (!preventAnimation) {
    if (MAX_ANIMATION_DURATION) {
      // Pause tasks to keep animation smooth
      treesaver.scheduler.pause(['animatePages'], 2 * MAX_ANIMATION_DURATION);

      // Percent of time left in animation
      var t = 1 - (goog.now() - this.animationStart || 0) / MAX_ANIMATION_DURATION;
      // Clamp into 0,1
      t = Math.max(0, Math.min(1, t));

      // Cubic easing
      this.pageOffset = Math.round(this.pageOffset * Math.pow(t, 3));

      if (!this.pageOffset) {
        this.pageOffset = 0;
        // Re-enable other tasks
        treesaver.scheduler.resume();
      }
      else {
        // Queue up another call in a bit
        this._updatePagePositionsDelayed();
      }
    }
    else {
      // No animation means no offset to animate
      this.pageOffset = 0;
    }
  }
  else {
    // Stop any animations that might be queued
    treesaver.scheduler.clear('animatePages');
  }

  // Update position
  this.pages.forEach(function(page, i) {
    if (page && page.node) {
      treesaver.dimensions.setOffsetX(page.node, this.pagePositions[i] + this.pageOffset);
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
