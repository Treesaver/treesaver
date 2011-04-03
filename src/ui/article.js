/**
 * @fileoverview Article class.
 */

goog.provide('treesaver.ui.Article');

goog.require('treesaver.array');
goog.require('treesaver.debug');
goog.require('treesaver.constants');
goog.require('treesaver.dimensions');
goog.require('treesaver.dom');
goog.require('treesaver.events');
goog.require('treesaver.layout.BreakRecord');
goog.require('treesaver.layout.Content');
goog.require('treesaver.layout.ContentPosition');
goog.require('treesaver.layout.Grid');
goog.require('treesaver.layout.Page');
goog.require('treesaver.network');
goog.require('treesaver.scheduler');

/**
 * A chunk of content
 *
 * @constructor
 * @param {!string} url
 * @param {!string} title
 * @param {!Array.<treesaver.layout.Grid>} grids
 * @param {string=} html
 */
treesaver.ui.Article = function(url, title, grids, node) {
  /**
   * @type {?string}
   */
  this.theme = null;

  /**
   * @type {treesaver.layout.Content} The content of this article
   */
  this.content = null;

  /**
   * @type {!string}
   */
  this.url = url;

  /**
   * @type {!string}
   */
  this.path = treesaver.network.urlToPath(url);

  /**
   * @type {string}
   */
  this.title = title;

  /**
   * @type {treesaver.layout.BreakRecord}
   */
  this.br = null;

  /**
   * @type {number}
   */
  this.pageCount = 0;

  /**
   * @type {Array.<treesaver.layout.Page>}
   */
  this.pages = [];

  /**
   * @type {boolean}
   */
  this.paginationClean = false;

  /**
   * @type {boolean}
   */
  this.paginationComplete = false;

  /**
   * @type {boolean}
   */
  this.loaded = false;

  /**
   * @type {boolean}
   */
  this.loading = false;

  /**
   * @type {boolean}
   */
  this.loadFailed = false;

  /**
   * @type {boolean}
   */
  this.error = false;

  /**
   * @type {?{ w: number, h: number }} size
   */
  this.maxPageSize = null;

  /**
   * Constraint ...
   * @type {?treesaver.dimensions.SizeRange}
   */
  this.constraint = null;

  /**
   * @type {!Array.<treesaver.layout.Grid>}
   */
  this.eligible_grids = [];

  /**
   * @type {Array.<treesaver.layout.Grid>}
   */
  this.grids = grids;

  // Automatically process the HTML, if any was given to us
  if (node) {
    this.processHTML(node);
  }
};

/**
 * Names of events fired by this class
 * @type {Object.<string, string>}
 */
treesaver.ui.Article.events = {
  LOADFAILED: 'treesaver.loadfailed',
  LOADED: 'treesaver.loaded',
  PAGINATIONERROR: 'treesaver.paginationerror',
  PAGINATIONPROGRESS: 'treesaver.paginationprogress'
};

/**
 * @param {?string} html  HTML for the article. May be just the
 *                        <article> node, or an entire .html page.
 */
treesaver.ui.Article.prototype.processHTML = function(article_node) {
  // Content is here, so we're loaded
  this.loaded = true;

  // Container used for manipulation and finding things
  var fake_grid = document.createElement('div'),
      fake_column = document.createElement('div');

  // Set up a temporary container for layout
  fake_grid.style.display = 'none';
  treesaver.dom.addClass(fake_grid, 'offscreen grid');
  treesaver.dom.addClass(fake_column, 'column');

  // Container needs to be in tree for measuring, and for
  // IE HTML5 shiv to work properly as well
  document.body.appendChild(fake_grid);

  // Remove any ID so CSS styles don't affect the elements within
  article_node.removeAttribute('id');

  // Clear the container so node can be the only thing in it
  treesaver.dom.clearChildren(fake_grid);

  // Set up theme flag, if it exists
  // TODO: Remove compatibility data-grids parameter
  this.theme = article_node.getAttribute('data-theme') ||
    article_node.getAttribute('data-grids') || null;
  if (this.theme) {
    treesaver.dom.addClass(fake_grid, this.theme);
    treesaver.dom.addClass(fake_column, this.theme);

    // New theme means grids need to be filtered again
    this.setGrids(this.grids);
  }

  // Move the content from the article to the column
  while (article_node.firstChild) {
    fake_column.appendChild(article_node.firstChild);
  }
  fake_grid.appendChild(fake_column);
  // Re-enable visibility, so the browser can measure layout
  fake_column.style.display = 'block';
  fake_grid.style.display = 'block';

  // Construct
  this.content = new treesaver.layout.Content(fake_column);

  // Clean up the DOM
  document.body.removeChild(fake_grid);
  fake_grid.removeChild(fake_column);
  treesaver.dom.clearChildren(fake_column);

  // Reset pagination state
  this.resetPagination();

  return true;
};

/**
 * Set the grids which can be used by this article
 * Grids that don't meet theme requirements are ignored
 *
 * @param {Array.<treesaver.layout.Grid>} all_grids
 */
treesaver.ui.Article.prototype.setGrids = function(all_grids) {
  // Filter out any grids that don't match our article classes
  if (this.theme) {
    this.grids = all_grids.filter(function(grid) {
      return grid.hasTheme(this.theme);
    }, this);
  }
  else {
    // Shallow clone the array
    this.grids = all_grids.slice(0);
  }
};

/**
 * Stretch the grids into appropriate heights, and filter out any grids
 * which do not fit. Return the stretched subset of grids in an array
 * @param {{ w: number, h: number }} size
 * @return {Array.<treesaver.layout.Grid>}
 */
treesaver.ui.Article.prototype.stretchGrids = function(size) {
  this.eligible_grids = this.grids.filter(function(grid) {
    return grid.capabilityFilter() && grid.sizeFilter(size);
  }).map(function(grid) {
    // Now stretch to the space
    return grid.stretch(size.h);
  });

  // Are there any grids?
  if (!this.eligible_grids.length) {
    treesaver.debug.error('No eligible grids at ' + size.w + 'x' + size.h);
  }

  // Sort by highest text height (helps with shortcutting in scoring)
  this.eligible_grids.sort(treesaver.layout.Grid.sort);
};

/**
 * Set the maximum size pages in this article are allowed to be
 * @param {{ w: number, h: number }} size
 * @return {boolean} True if a re-layout will be required at this size.
 */
treesaver.ui.Article.prototype.setMaxPageSize = function(size) {
  if (!this.maxPageSize ||
      this.maxPageSize.w !== size.w || this.maxPageSize.h !== size.h) {
    this.maxPageSize = size;

    // Check if all the pages of our content will fit at this size
    this.paginationClean =
      treesaver.dimensions.inSizeRange(/** @type {!treesaver.dimensions.SizeRange} */ (this.constraint), size);
  }

  return !this.paginationClean;
};

/**
 * Reset all pagination data and stored pages.
 */
treesaver.ui.Article.prototype.resetPagination = function() {
  // Stop all pagination related tasks
  treesaver.scheduler.clear('paginate');

  // Clear out the old pages
  this.pages = [];
  this.pageCount = 0;

  // Filter and stretch grids to the current size
  if (this.maxPageSize) {
    this.stretchGrids(this.maxPageSize);
  }

  // Our old break record is now useless
  this.br = new treesaver.layout.BreakRecord();

  // As is the constraint
  this.constraint = null;

  // Pagination is clean (even if there are no pages right now)
  this.paginationClean = true;
  this.paginationComplete = false;
};

/**
 * Paginate the article asynchronously
 * @param {boolean} bg Paginate remainder of article in background.
 * @param {number} index Paginate synchronously until this index.
 * @param {?treesaver.layout.ContentPosition|number} pos Paginate synchronously until this position.
 * @private
 */
treesaver.ui.Article.prototype.paginate = function(bg, index, pos) {
  if (goog.DEBUG) {
    if (!this.content) {
      treesaver.debug.error('Tried to paginate missing content');
      return;
    }

    if (!this.maxPageSize) {
      treesaver.debug.error('Tried to paginate without a page size');
      return;
    }

    if (this.paginationComplete) {
      treesaver.debug.info('Needless call to paginate');
      return;
    }
  }

  // Stop any previous pagination
  // (TODO: What if this conflicts with other articles?)
  treesaver.scheduler.clear('paginate');

  var page;
  index = index || 0;

  while (!this.br.finished) {
    page = new treesaver.layout.Page(
      /** @type {!treesaver.layout.Content } */ (this.content),
      this.eligible_grids,
      /** @type {!treesaver.layout.BreakRecord} */ (this.br)
    );

    // Pagination can fail to produce a useful page
    if (page.ignore) {
      if (this.br.finished) {
        treesaver.debug.info('Page ignored during pagination and article terminated');
      }
      else {
        treesaver.debug.info('Page ignored during pagination');
      }

      if (this.br.finished) {
        break;
      }

      // Ignore this page and try again
      continue;
    }
    else if (page.error) {
      if (this.br.finished) {
        // Meh, I guess we're done
        break;
      }
      // Something went wrong
      this.error = true;

      // Fire pagination error for logging
      treesaver.events.fireEvent(
        document,
        treesaver.ui.Article.events.PAGINATIONERROR,
        { article: this }
      );

      // Put the error page in the collection

      // For now, just set finished so people can move on with their lives
      // TODO: Force re-layout?
      this.br.finished = true;

      break;
    }

    // Page is OK, add it to our collection
    this.pages.push(page);
    this.pageCount += 1;
    // Clear the error flags
    this.error = false;

    // Update page constraint
    this.constraint =
      treesaver.dimensions.mergeSizeRange(/** @type {!treesaver.dimensions.SizeRange} */ (this.constraint), page.size, true);

    if (index && this.pageCount <= index ||
        pos && ((pos === treesaver.layout.ContentPosition.END) || !pos.lessOrEqual(page.end))) {
      // Not done yet, gotta keep on going
      continue;
    }
    // Check if we can background the rest
    else if (!this.br.finished) {
      if (bg) {
        // Fire progress event, but only when async
        // TODO: Is this the right thing here?
        treesaver.events.fireEvent(
          document,
          treesaver.ui.Article.events.PAGINATIONPROGRESS,
          { article: this }
        );

        // Delay rest of pagination to make sure UI thread doesn't hang
        this.paginateAsync(treesaver.array.toArray(arguments));
      }

      // Break out of loop early
      return;
    }
  }

  // All done, fire completed event
  this.paginationComplete = true;
  treesaver.events.fireEvent(
    document,
    treesaver.ui.Article.events.PAGINATIONPROGRESS,
    { article: this, completed: true }
  );
};

/**
 * Start asynchronous pagination
 * @param {Array} args Arguments array to pass to the paginate function.
 */
treesaver.ui.Article.prototype.paginateAsync = function(args) {
  treesaver.scheduler.delay(treesaver.ui.Article.prototype.paginate,
      PAGINATE_DEBOUNCE_TIME, args, 'paginate', this);
};

/**
 * Return a width appropriate for use in the chrome for pageWidth
 * elements
 * @return {number}
 */
treesaver.ui.Article.prototype.getPageWidth = function() {
  if (this.constraint) {
    return this.constraint.w;
  }

  return 0;
};

/**
 * Return an array of pages corresponding to the pages requested.
 *
 * Pages that have been paginated and are ready are returned immediately
 * If pages are not ready, null is returned in their place
 * If the pages requested are outside the total number of pages in the
 * article, a shorter array is returned (i.e. if the first 5 pages are
 * requested, but the article only has 3 pages, then an array with 3 items
 * will be returned)
 *
 * @param {number} start  If negative, counts from end of document.
 * @param {number} count  Number of pages requested.
 * @return {Array.<treesaver.layout.Page>}
 */
treesaver.ui.Article.prototype.getPages = function(start, count) {
  if (goog.DEBUG) {
    // Do we have our content yet?
    if (!this.loaded) {
      if (!this.loading) {
        treesaver.debug.error('Tried to getPages on non-loaded article');
      }

      // Return dead pages, fire event when they are ready
      return new Array(count);
    }
  }

  // If the pages are invalid, then we're out of luck in terms of re-use
  if (!this.paginationClean) {
    // Scrap what we had before
    this.resetPagination();
  }

  var pages = [],
      max_requested = start >= 0 ? (start + count - 1) : Infinity,
      i, new_max;

  // Whatever pages we have are valid, but see if we need to get more
  if (!this.paginationComplete && max_requested > this.pages.length - 1) {
    // We are missing pages, so queue up a task to paginate the remaining
    // ones asynchronously. Client should then listen to pagination events
    // to know when to re-query for pages again
    this.paginateAsync([true, max_requested]);
  }

  if (!this.paginationComplete) {
    // No way of knowing how many total pages there will be, pad array
    // with empties
    pages.length = count;

    if (start < 0) {
      // Can't return anything sensible since we need to start at end,
      // so exit early
      return pages;
    }
  }
  else {
    // Make sure we're not trying to get more pages than we have
    count = Math.min(count, this.pageCount -
        (start >= 0 ? start : start - 1));
  }

  // Loop varies if counting backwards
  if (start < 0) {
    for (i = -start; i <= count; i += 1) {
      pages[i + start] = this.pages[this.pageCount - i];
    }
  }
  else {
    for (i = start; i < start + count; i += 1) {
      pages[i - start] = this.pages[i];
    }
  }

  return pages;
};

/**
 * Find the index of the page that contains the given position
 * will do asynchronous pagination in order to find out
 *
 * @param {?treesaver.layout.ContentPosition} position
 * @return {number} Index of the page with that position, -1 if it is
 *                  currently unknown because the content hasn't paginated
 *                  that far yet.
 */
treesaver.ui.Article.prototype.getPageIndex = function(position) {
  if (!this.content) {
    // Haven't loaded yet
    return -1;
  }

  var i, len, cur;

  // Special case for first page
  if (!position || position.atBeginning()) {
    return 0;
  }

  // If the pages are invalid, then we're out of luck
  if (!this.paginationClean) {
    // Scrap what we had before
    this.resetPagination();
  }

  // We might need to paginate more
  if (!this.paginationComplete) {
    if (position === treesaver.layout.ContentPosition.END || !this.pageCount ||
        !position.lessOrEqual(this.pages[this.pageCount - 1].end)) {
      // Need to paginate up to that position
      // TODO: Postpone this
      this.paginateAsync([true, null, position]);
      return -1;
    }
  }

  // Special case for the last page request
  if (position === treesaver.layout.ContentPosition.END) {
    // If we've paginated, give the last page, otherwise we don't know
    return this.paginationComplete ? this.pageCount - 1 : -1;
  }

  // Go through each page to find where we can stop
  for (i = 0, len = this.pageCount; i < len; i += 1) {
    if (this.pages[i].end.greater(position)) {
      return i;
    }
  }

  // If pagination is complete, then we can give out the last page since
  // that's where the content certainly occurs at this point
  // However, if pagination isn't complete, then return -1 to indicate that
  // we don't know where the position occurs
  return this.paginationComplete ? this.pageCount - 1 : -1;
};

if (goog.DEBUG) {
  treesaver.ui.Article.prototype.toString = function() {
    return '[treesaver.ui.Article]';
  };
}
