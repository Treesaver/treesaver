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
goog.require('treesaver.template');
goog.require('treesaver.ui.ArticleManager');
goog.require('treesaver.ui.input');

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
   * TODO: Only store transient capabilities
   *
   * @type {?Array.<string>}
   */
  this.requirements = treesaver.dom.hasAttr(node, 'data-requires') ?
    node.getAttribute('data-requires').split(' ') : null;

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
  delete this.size.width;
  delete this.size.height;

  /**
   * The area available to pages (i.e. the size of the viewer)
   * @type {treesaver.dimensions.Size}
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
   * Cached reference to page number DOM
   * @type {?Array.<Element>}
   */
  this.pageNum = null;

  /**
   * Cached reference to page count DOM
   * @type {?Array.<Element>}
   */
  this.pageCount = null;

  /**
   * Cached reference to page width DOM
   * @type {?Array.<Element>}
   */
  this.pageWidth = null;

  /**
   * Cached reference to the TOC DOM
   * @type {?Element}
   */
  this.toc = null;

  /**
   * Cached reference to the TOC Template DOM
   * @type {?Element}
   */
  this.tocTemplate = null;

  /**
   * @type {?Array.<treesaver.layout.Page>}
   */
  this.pages = null;

  /**
   * Cached references to the menu TOC
   * @type {?Element}
   */
  this.menu = null;

  /**
   * @type {boolean}
   */
  this.lightBoxActive = false;

  /**
   * @type {?treesaver.ui.LightBox}
   */
  this.lightBox = null;

  /*
   * Cached reference to article url DOM
   * @type {?Array.<Element>}
   */
  this.currentURL = null;

  /**
   * @type {?Element}
   */
  this.sidebar = null;

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
};

/**
 * @return {!Element} The activated node.
 */
treesaver.ui.Chrome.prototype.activate = function() {
  var toc = [],
      tocTemplates = [],
      menus = [],
      sidebars = [];

  if (!this.active) {
    this.active = true;

    this.node = treesaver.dom.createElementFromHTML(this.html);
    // Store references to the portions of the UI we must update
    this.viewer = treesaver.dom.getElementsByClassName('viewer', this.node)[0];
    this.pageNum = treesaver.template.getElementsByBindName('pagenumber', null, this.node);
    this.pageCount = treesaver.template.getElementsByBindName('pagecount', null, this.node);
    this.pageWidth = treesaver.dom.getElementsByClassName('pagewidth', this.node);
    this.currentURL = treesaver.template.getElementsByBindName('current-url', null, this.node);
    this.nextPage = treesaver.dom.getElementsByClassName('next', this.node);
    this.nextArticle = treesaver.dom.getElementsByClassName('nextArticle', this.node);
    this.prevPage = treesaver.dom.getElementsByClassName('prev', this.node);
    this.prevArticle = treesaver.dom.getElementsByClassName('prevArticle', this.node);

    menus = treesaver.dom.getElementsByClassName('menu', this.node);
    if (menus.length > 0) {
      this.menu = menus[0];
    }

    toc = treesaver.template.getElementsByBindName('toc', null, this.node);

    // TODO: We might want to do something smarter than just selecting the first
    // TOC template.
    if (toc.length >= 1) {
      this.toc = /** @type {!Element} */ (toc[0]);
      this.tocTemplate = /** @type {!Element} */ (this.toc.cloneNode(true));
    }

    sidebars = treesaver.dom.getElementsByClassName('sidebar', this.node);

    if (sidebars.length > 0) {
      this.sidebar = sidebars[0];
    }

    this.pages = [];

    // Setup event handlers
    treesaver.ui.Chrome.watchedEvents.forEach(function(evt) {
      treesaver.events.addListener(document, evt, this);
    }, this);

    // Mark the UI as active to show the user controls?
    this.uiActive();
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
  this.pageNum = null;
  this.pageCount = null;
  this.pageWidth = null;
  this.menu = null;
  this.currentURL = null;
  this.toc = null;
  this.tocTemplate = null;
  this.sidebar = null;
  this.nextPage = null;
  this.nextArticle = null;
  this.prevPage = null;
  this.prevArticle = null;

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

treesaver.ui.Chrome.events = {
};

/**
 * @type {Array.<string>}
 */
treesaver.ui.Chrome.watchedEvents = [
  treesaver.ui.ArticleManager.events.TOCUPDATED,
  treesaver.ui.ArticleManager.events.PAGESCHANGED,
  treesaver.ui.ArticleManager.events.ARTICLECHANGED,
  treesaver.ui.input.events.KEYDOWN,
  treesaver.ui.input.events.CLICK,
  treesaver.ui.input.events.MOUSEWHEEL,
  treesaver.ui.input.events.MOUSEDOWN,
  treesaver.ui.input.events.ACTIVE,
  treesaver.ui.input.events.IDLE
];

/**
 * @private
 * @type {Array.<string>}
 */
treesaver.ui.Chrome.optInMouseEvents_ = [
  treesaver.ui.input.events.MOUSEMOVE,
  treesaver.ui.input.events.MOUSEUP,
  treesaver.ui.input.events.MOUSECANCEL
];

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

  case treesaver.ui.ArticleManager.events.TOCUPDATED:
    this.updateTOCDelayed();
    return this.selectPagesDelayed();

  case treesaver.ui.ArticleManager.events.ARTICLECHANGED:
    this.updateTOCActive(e);
    return this.updatePageURL(e);

  case treesaver.ui.input.events.ACTIVE:
    return this.uiActive();

  case treesaver.ui.input.events.IDLE:
    this.menuInactive();
    return this.uiIdle();

  case treesaver.ui.input.events.KEYDOWN:
    return this.keyDown(e);

  case treesaver.ui.input.events.CLICK:
    return this.click(e);

  case treesaver.ui.input.events.MOUSEWHEEL:
    return this.mouseWheel(e);

  case treesaver.ui.input.events.MOUSEDOWN:
    return this.mouseDown(e);

  case treesaver.ui.input.events.MOUSEMOVE:
    return this.mouseMove(e);

  case treesaver.ui.input.events.MOUSEUP:
    return this.mouseUp(e);

  case treesaver.ui.input.events.MOUSECANCEL:
    return this.mouseCancel(e);
  }
};

/**
 * Handle keyboard events
 * @param {!Object} e
 * @return {boolean} False if event is handled.
 */
treesaver.ui.Chrome.prototype.keyDown = function(e) {
  // Lightbox active? Hide it
  if (this.lightBoxActive) {
    this.hideLightBox();
    e.preventDefault();
    return false;
  }

  // Don't override keyboard commands
  if (!e.specialKey) {
    switch (e.key) {
    case 34: // PageUp
    case 39: // Right && down
    case 40:
    case 32: // Space
      treesaver.ui.ArticleManager.nextPage();
      break;

    case 33: // PageDown
    case 37: // Left & up
    case 38:
      treesaver.ui.ArticleManager.previousPage();
      break;

    default: // Let the event through if not handled
      return true;
    }

    // Cancel bubbling
    if (e.preventDefault) {
      e.preventDefault();
    }
    else {
      e.returnValue = false;
    }
    return false;
  }

  return true;
};

/**
 * Handle click event
 * @param {!Object} e
 */
treesaver.ui.Chrome.prototype.click = function(e) {
  // Lightbox active? Hide it
  if (this.lightBoxActive) {
    this.hideLightBox();
    e.preventDefault();
    return false;
  }

  // No real target, leave the event alone
  if (e.el === document.body || e.el === document.documentElement) {
    return;
  }

  var el = e.el,
      url,
      withinCurrentPage = false,
      handled = false,
      sidebarActivated = false,
      menuActivated = false;

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
    while (!handled && el !== document.body) {
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
          if (this.isMenuActive()) {
            this.menuInactive();
          }
          else {
            this.menuActive();
            menuActivated = true;
          }
          handled = true;
        }
        else if (treesaver.dom.hasClass(el, 'sidebar') ||
                treesaver.dom.hasClass(el, 'open-sidebar')) {
          if (!this.isSidebarActive()) {
            this.sidebarActive();
            sidebarActivated = true;
          }
          handled = true;
        }
        else if (treesaver.dom.hasClass(el, 'close-sidebar')) {
          if (this.isSidebarActive()) {
            this.sidebarInactive();
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
          el = el.parentNode;
          continue;
        }

        url = treesaver.network.absoluteURL(el.href);
        if (!treesaver.ui.ArticleManager.goToArticleByURL(url)) {
          // The URL is not an article, let the navigation happen normally
          handled = false;
          return;
        }

        handled = true;
      }

      el = el.parentNode;
    }
  }

  if (!menuActivated && this.isMenuActive()) {
    this.menuInactive();
  }

  if (!sidebarActivated && this.isSidebarActive() && !handled) {
    this.sidebarInactive();
  }

  if (handled) {
    e.preventDefault();
  }

  return (e.returnValue = !handled);
};

/**
 * Handle the mousewheel event
 * @param {Object} e
 */
treesaver.ui.Chrome.prototype.mouseWheel = function(e) {
  // Lightbox active? Hide it
  if (this.lightBoxActive) {
    this.hideLightBox();
    e.preventDefault();
    return false;
  }

  if (e.delta) {
    if (e.delta > 0) {
      treesaver.ui.ArticleManager.previousPage();
    }
    else {
      treesaver.ui.ArticleManager.nextPage();
    }

    e.preventDefault();
    return false;
  }
};

/**
 * Handle the mousedown event
 * @param {!Object} e
 */
treesaver.ui.Chrome.prototype.mouseDown = function(e) {
  // Lightbox active? Hide it
  if (this.lightBoxActive) {
    this.hideLightBox();
    e.preventDefault();
    return false;
  }

  // Only support swipe when we're not swiping on a link, or other element
  // that might have some action associated with it
  // TODO: What???

  // Only listen to events within the viewer, don't want errant swipes
  if (this.viewer.contains(e.el)) {
    // Start listening to relevant events
    treesaver.ui.Chrome.optInMouseEvents_.forEach(function(evt) {
      treesaver.events.addListener(document, evt, this);
    }, this);

    // Hm, preventing default seems to kill iPhone link following.
    // Don't do anything for now ...
    //e.preventDefault();
    //return false;
  }
};

/**
 * Handle the mousemove event
 * @param {!Object} e
 */
treesaver.ui.Chrome.prototype.mouseMove = function(e) {
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
    // Update offset
    this.pageOffset = e.deltaX;
    this._updatePagePositions(true);
    e.preventDefault();
    return false;
  }
  else {
    // Don't offset
    this.pageOffset = 0;
    this._updatePagePositions(true);
  }
};

/**
 * Handle the mouseup event
 * @param {!Object} e
 */
treesaver.ui.Chrome.prototype.mouseUp = function(e) {
  var pageChanged = false;

  // Stop listening to events
  this.removeMouseHandlers_();

  if ((Math.abs(e.deltaX) > Math.abs(e.deltaY)) &&
      (Math.abs(e.deltaX) > SWIPE_THRESHOLD) &&
      e.deltaTime < SWIPE_TIME_LIMIT) {
    // A swipe, but we have to check and see if it actually
    // caused a page change
    if (e.deltaX < 0) {
      pageChanged = treesaver.ui.ArticleManager.nextPage();
    }
    else {
      pageChanged = treesaver.ui.ArticleManager.previousPage();
    }
  }

  if (pageChanged) {
    // Page swiped and animation will occur. preventDefault in order to avoid
    // activating links, etc
    e.preventDefault();
    return false;
  }
  else {
    // Not a swipe, animate back to the initial position
    // and let the event process
    this.animationStart = goog.now();
    this._updatePagePositions();

    return;
  }
};

/**
 * Handle the mousecancel event
 * @param {!Object} e
 */
treesaver.ui.Chrome.prototype.mouseCancel = function(e) {
  // This event can be tough to duplicate on touch devices, but need to make
  // sure the page position gets restored when it happens
  this.animationStart = goog.now();
  this._updatePagePositions();

  // Stop listening to events
  this.removeMouseHandlers_();
};

/**
 * Remove opt-in mouse event handlers
 *
 * @private
 */
treesaver.ui.Chrome.prototype.removeMouseHandlers_ = function() {
  // Remove event handlers
  treesaver.ui.Chrome.optInMouseEvents_.forEach(function(evt) {
    treesaver.events.removeListener(document, evt, this);
  }, this);
};

/**
 * Show hidden UI controls
 */
treesaver.ui.Chrome.prototype.uiActive = function() {
  treesaver.dom.addClass(/** @type {!Element} */ (this.node), 'active');
};

/**
 * Hide UI controls
 */
treesaver.ui.Chrome.prototype.uiIdle = function() {
  treesaver.dom.removeClass(/** @type {!Element} */ (this.node), 'active');
};

/**
 * Show menu
 */
treesaver.ui.Chrome.prototype.menuActive = function() {
  treesaver.dom.addClass(/** @type {!Element} */ (this.node), 'menu-active');
};

/**
 * Hide menu
 */
treesaver.ui.Chrome.prototype.menuInactive = function() {
  treesaver.dom.removeClass(/** @type {!Element} */ (this.node), 'menu-active');
};

/**
 * Returns the current state of the menu.
 */
treesaver.ui.Chrome.prototype.isMenuActive = function() {
  return treesaver.dom.hasClass(/** @type {!Element} */ (this.node), 'menu-active');
};

/**
 * Show sidebar
 */
treesaver.ui.Chrome.prototype.sidebarActive = function() {
  treesaver.dom.addClass(/** @type {!Element} */ (this.node), 'sidebar-active');
};

/**
 * Hide sidebar
 */
treesaver.ui.Chrome.prototype.sidebarInactive = function() {
  treesaver.dom.removeClass(/** @type {!Element} */ (this.node), 'sidebar-active');
};

/**
 * Determines whether or not the sidebar is active.
 *
 * @return {boolean} true if the sidebar is active, false otherwise.
 */
treesaver.ui.Chrome.prototype.isSidebarActive = function() {
  return treesaver.dom.hasClass(/** @type {!Element} */ (this.node), 'sidebar-active');
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
  treesaver.dimensions.setCssPx(this.lightBox.node, 'width', this.node.offsetWidth);
  treesaver.dimensions.setCssPx(this.lightBox.node, 'height', this.node.offsetHeight);

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
    w: this.viewer.offsetWidth,
    h: this.viewer.offsetHeight
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

  // Re-query for pages later
  this.selectPagesDelayed();
};

/**
 * Update any URL bindings to the active article in the Chrome.
 * @private
 * @param {!Object} e The article changed event.
 */
treesaver.ui.Chrome.prototype.updatePageURL = function(e) {
  this.currentURL.forEach(function(el) {
    treesaver.template.expand({
        'current-url': e.url
      }, el);
  });
};

/**
 * Update the TOC's 'current' class.
 *
 * @private
 * @param {!Object} e The TOC update event.
 */
treesaver.ui.Chrome.prototype.updateTOCActive = function(e) {
  if (this.toc) {
    var tocEntries = treesaver.ui.ArticleManager.getCurrentTOC(),
        tocElements = treesaver.template.getElementsByBindName('article', null, this.toc);

    if (tocEntries.length === tocElements.length) {
      tocEntries.forEach(function(entry, index) {
        if (entry.url === e.url) {
          treesaver.dom.addClass(tocElements[index], 'current');
        } else {
          treesaver.dom.removeClass(tocElements[index], 'current');
        }
      });
    }
  }
};

/**
 * Update the text of elements bound to the current page index
 * @private
 * @param {number} index
 */
treesaver.ui.Chrome.prototype.updatePageIndex = function(index) {
  this.pageNum.forEach(function(el) {
    treesaver.template.expand({
        'pagenumber': index
      }, el);
  });
};

/**
 * Update the text of elements bound to the page count
 * @private
 * @param {number} count
 */
treesaver.ui.Chrome.prototype.updatePageCount = function(count) {
  this.pageCount.forEach(function(el) {
    treesaver.template.expand({
      'pagecount': count
    }, el);
  });
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
  this.updateFields();

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

  if (this.toc) {
    var tocEntries = treesaver.ui.ArticleManager.getCurrentTOC(),
        newToc = /** @type {!Element} */ (this.tocTemplate.cloneNode(true)),
        tocParent = this.toc.parentNode;

    // Format the TOC entries to fit our TOC template format.
    tocEntries = tocEntries.map(function(entry) {
      return {
        article: entry
      };
    });

    // Expand the template using the cloned template.
    treesaver.template.expand({
      toc: tocEntries
    }, newToc);

    // And finally replace the old TOC with the new one.
    tocParent.replaceChild(newToc, this.toc);
    this.toc = newToc;

    // Update the TOC active item. We do this explicitly here
    // because we receive the article changed event (which is
    // normally used to update the active TOC) before the TOC
    // changed event.
    this.updateTOCActive({
      url: treesaver.ui.ArticleManager.currentArticle.url
    });
  }
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

  treesaver.dom.clearChildren(/** @type {!Element} */ (this.viewer));

  old_pages.forEach(function(page) {
    // Only deactivate pages we're not about to use again
    if (page) {
      if (this.pages.indexOf(page) === -1) {
        page.deactivate();
      }
    }
  }, this);

  this.pages.forEach(function(page) {
    if (page) {
      // Don't worry about extra calls to activate
      this.viewer.appendChild(page.activate());
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
  //
  var prevPage = this.pages[0],
      currentPage = this.pages[1],
      nextPage = this.pages[2],
      leftMarginEdge,
      rightMarginEdge,
      oldOffset = this.pageOffset;

  // Mark the master page
  currentPage.node.setAttribute('id', 'currentPage');

  // Center the first page
  leftMarginEdge = (this.pageArea.w -
      currentPage.size.outerW) / 2 - currentPage.size.marginLeft;
  rightMarginEdge = leftMarginEdge + currentPage.size.outerW +
    currentPage.size.marginWidth;

  // Register the positions of each page
  this.pagePositions = [];
  this.pagePositions[1] = leftMarginEdge;

  if (prevPage) {
    this.pagePositions[0] = leftMarginEdge -
      (prevPage.size.outerW + prevPage.size.marginLeft);
    prevPage.node.setAttribute('id', 'previousPage');
  }

  if (nextPage) {
    this.pagePositions[2] = rightMarginEdge;
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

  this._updatePagePositions();
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

  // Pause tasks to keep animation smooth
  if (!preventAnimation) {
    treesaver.scheduler.pause(['animatePages'], 2 * MAX_ANIMATION_DURATION);
  }

  var now = goog.now(),
      percentRemaining = !preventAnimation ?
        Math.max(0, (this.animationStart || 0) +
          MAX_ANIMATION_DURATION - now) / MAX_ANIMATION_DURATION :
        1,
      ratio = -Math.cos(percentRemaining * Math.PI) / 2 + 0.5,
      offset = ratio * this.pageOffset;

  // Update position
  if (Math.abs(offset) < 5) {
    offset = 0;
  }
  else {
    now = 0;
  }

  this.pages.forEach(function(page, i) {
    if (page) {
      this.setPagePosition(page, this.pagePositions[i] + offset);
    }
  }, this);

  if (offset && !preventAnimation) {
    // Run again in a bit
    this._updatePagePositionsDelayed();
  }
  else if (!offset) {
    this.pageOffset = 0;
    if (!preventAnimation) {
      treesaver.scheduler.resume();
    }
  }
};

/**
 * @param {number} offset
 */
treesaver.ui.Chrome.prototype.setPagePosition = function(page, offset) {
  if (page.node) {
    // TODO: Detect only once
    if ('transform' in page.node.style) {
      page.node.style['transform'] = 'translate(' + offset + 'px, 0)';
    }
    else if ('webkitTransform' in page.node.style) {
      page.node.style['webkitTransform'] = 'translate(' + offset + 'px, 0)';
    }
    else if ('MozTransform' in page.node.style) {
      page.node.style['MozTransform'] = 'translate(' + offset + 'px, 0)';
    }
    else {
      treesaver.dimensions.setCssPx(page.node, 'left', offset);
    }
  }
};

/**
 * Update the display of fields like the page count
 */
treesaver.ui.Chrome.prototype.updateFields = function() {
  this.updatePageIndex(treesaver.ui.ArticleManager.getCurrentPageNumber());
  this.updatePageCount(treesaver.ui.ArticleManager.getCurrentPageCount());
  this.updatePageWidth(treesaver.ui.ArticleManager.getCurrentPageWidth());
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
