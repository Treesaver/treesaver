/**
 * @fileoverview The chrome class
 */

goog.provide('treesaver.ui.Chrome');

goog.require('treesaver.debug');
goog.require('treesaver.dimensions');
goog.require('treesaver.dom');
goog.require('treesaver.network');
goog.require('treesaver.scheduler');
goog.require('treesaver.ui.input');
goog.require('treesaver.ui.ArticleManager');

/**
 * Chrome
 * @param {!Element} node HTML node
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
   * @type {?Array.<treesaver.layout.Page>}
   */
  this.pages = null;
}

/**
 * @return {!Element} The activated node
 */
treesaver.ui.Chrome.prototype.activate = function() {
  if (!this.active) {
    this.active = true;

    this.node = treesaver.dom.createElementFromHTML(this.html);
    // Store references to the portions of the UI we must update
    this.viewer = treesaver.dom.getElementsByClassName('viewer', this.node)[0];
    this.pageNum = treesaver.dom.getElementsByClassName('pagenumber', this.node);
    this.pageCount = treesaver.dom.getElementsByClassName('pagecount', this.node);
    this.pageWidth = treesaver.dom.getElementsByClassName('pagewidth', this.node);

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
  treesaver.ui.input.events.KEYDOWN,
  treesaver.ui.input.events.CLICK,
  treesaver.ui.input.events.MOUSEWHEEL,
  treesaver.ui.input.events.MOUSEDOWN,
  treesaver.ui.input.events.MOUSEMOVE,
  treesaver.ui.input.events.MOUSEUP,
  treesaver.ui.input.events.MOUSECANCEL,
  treesaver.ui.input.events.ACTIVE,
  treesaver.ui.input.events.IDLE
];

/**
 * Event dispatcher for all events
 * @param {Event} e
 */
treesaver.ui.Chrome.prototype['handleEvent'] = function(e) {
  switch (e.type) {
  case treesaver.ui.ArticleManager.events.PAGESCHANGED:
  case treesaver.ui.ArticleManager.events.TOCUPDATED:
    // Both these events mean that the pages we are displaying
    // (or trying to display) may have changed. Make sure to
    // fetch them again
    // Article changed and TOC changed will affect nav indicators
    return this.selectPagesDelayed();

  case treesaver.ui.input.events.ACTIVE:
    return this.uiActive();

  case treesaver.ui.input.events.IDLE:
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
 * @return {boolean} False if event is handled
 */
treesaver.ui.Chrome.prototype.keyDown = function(e) {
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
  // No real target, leave the event alone
  if (e.el === document.body || e.el === document.documentElement) {
    return;
  }

  var el = e.el,
      url,
      id,
      handled = false;

  // Go up the tree and see if there's anything we want to process
  while (!handled && el !== document.body) {
    id = el.getAttribute('id');

    // Detect chrome buttons for prev/next, etc
    if (treesaver.dom.hasClass(el, 'prev') || id && id === 'previousPage') {
      treesaver.ui.ArticleManager.previousPage();

      handled = true;
    }
    else if (treesaver.dom.hasClass(el, 'next') || id && id === 'nextPage') {
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
    else if ('href' in el) {
      // TODO: What if it's not in the current page?
      // check element.contains on current page ...

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
  // Only support swipe when we're not swiping on a link, or other element
  // that might have some action associated with it
  // TODO: What???

  // Only listen to events within the viewer, don't want errant swipes
  if (this.viewer.contains(e.el)) {
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
  if ((Math.abs(e.deltaX) > Math.abs(e.deltaY)) &&
      (Math.abs(e.deltaX) > SWIPE_THRESHOLD) &&
      e.deltaTime < SWIPE_TIME_LIMIT) {
    // A swipe
    if (e.deltaX < 0) {
      treesaver.ui.ArticleManager.nextPage();
    }
    else {
      treesaver.ui.ArticleManager.previousPage();
    }

    e.preventDefault();
    return false;
  }
  else {
    // Not a swipe, restore our offset and let the event process
    this.pageOffset = 0;
    this.animationStart = (new Date()).getTime();
    this._updatePagePositions();
    return;
  }
};

/**
 * Handle the mousecancel event
 * @param {!Object} e
 */
treesaver.ui.Chrome.prototype.mouseCancel = function(e) {
  // Nothing?
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
 * @param {treesaver.dimensions.Size} availSize
 * @return {boolean} True if fits
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
 * Update the text of elements bound to the current page index
 * @private
 * @param {number} index
 */
treesaver.ui.Chrome.prototype.updatePageIndex = function(index) {
  this.pageNum.forEach(function(el) {
    el.firstChild.nodeValue = index;
  });
};

/**
 * Update the text of elements bound to the page count
 * @private
 * @param {number} count
 */
treesaver.ui.Chrome.prototype.updatePageCount = function(count) {
  this.pageCount.forEach(function(el) {
    el.firstChild.nodeValue = count;
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
 * Run selectPages on a delay
 * @private
 */
treesaver.ui.Chrome.prototype.selectPagesDelayed = function() {
  treesaver.scheduler.queue(this.selectPages, [], 'selectPages', this);
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
};

/**
 * Populates the pages array for layout
 *
 * @private
 * @param {number} direction The direction to animate any transition
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
 * @param {number} direction The direction to animate any transition
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
    this.animationStart = (new Date()).getTime();

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

  var now = (new Date()).getTime(),
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
 * @return {treesaver.ui.Chrome|null} A suitable Chrome, if one was found
 */
treesaver.ui.Chrome.select = function(chromes, availSize) {
  // Cycle through chromes
  var i, len, current, chrome = null;

  for (i = 0, len = chromes.length; i < len; i += 1) {
    current = chromes[i];
    if (current.fits(availSize)) {
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
    return "[Chrome: ]";
  };
}
