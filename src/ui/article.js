/**
 * @fileoverview Article class.
 */

goog.provide('treesaver.ui.Article');

goog.require('treesaver.array');
goog.require('treesaver.debug');
goog.require('treesaver.dimensions');
goog.require('treesaver.dom');
goog.require('treesaver.events');
goog.require('treesaver.layout.BreakRecord');
goog.require('treesaver.layout.Content');
goog.require('treesaver.layout.ContentPosition');
goog.require('treesaver.layout.Grid');
goog.require('treesaver.layout.Page');
goog.require('treesaver.scheduler');

goog.scope(function() {
  /**
   * A chunk of content
   *
   * @constructor
   * @param {!Array.<treesaver.layout.Grid>} grids
   * @param {?Element} node
   */
  treesaver.ui.Article = function(grids, node, doc) {
    this.pages = [];
    this.eligible_grids = [];
    this.grids = grids;
    this.doc = doc;

    // Automatically process the HTML, if any was given to us
    if (node) {
      this.processHTML(node);
    }
  };
});

goog.scope(function() {
  var Article = treesaver.ui.Article,
      array = treesaver.array,
      debug = treesaver.debug,
      dimensions = treesaver.dimensions,
      dom = treesaver.dom,
      events = treesaver.events,
      scheduler = treesaver.scheduler,
      BreakRecord = treesaver.layout.BreakRecord,
      Content = treesaver.layout.Content,
      ContentPosition = treesaver.layout.ContentPosition,
      Grid = treesaver.layout.Grid,
      Page = treesaver.layout.Page;

  /**
   * @type {?string}
   */
  Article.prototype.theme;

  /**
   * @type {treesaver.layout.Content} The content of this article
   */
  Article.prototype.content;

  /**
   * @type {treesaver.layout.BreakRecord}
   */
  Article.prototype.br;

  /**
   * @type {number}
   */
  Article.prototype.pageCount;

  /**
   * @type {Array.<treesaver.layout.Page>}
   */
  Article.prototype.pages;

  /**
   * @type {boolean}
   */
  Article.prototype.paginationClean;

  /**
   * @type {boolean}
   */
  Article.prototype.paginationComplete;

  /**
   * @type {boolean}
   */
  Article.prototype.loaded;

  /**
   * @type {boolean}
   */
  Article.prototype.loading;

  /**
   * @type {boolean}
   */
  Article.prototype.loadFailed;

  /**
   * @type {boolean}
   */
  Article.prototype.error;

  /**
   * @type {?{ w: number, h: number }} size
   */
  Article.prototype.maxPageSize;

  /**
   * Constraint ...
   * @type {?treesaver.dimensions.SizeRange}
   */
  Article.prototype.constraint;

  /**
   * @type {!Array.<treesaver.layout.Grid>}
   */
  Article.prototype.eligible_grids;

  /**
   * @type {Array.<treesaver.layout.Grid>}
   */
  Article.prototype.grids;

  /**
   * Reference to the parent document.
   * @type {!treesaver.ui.Document}
   */
  Article.prototype.doc;

  /**
   * Names of events fired by this class
   * @type {Object.<string, string>}
   */
  Article.events = {
    PAGINATIONERROR: 'treesaver.paginationerror',
    PAGINATIONPROGRESS: 'treesaver.paginationprogress'
  };

  /**
   * @param {?Element} article_node  The article node containing the content for this article.
   */
  Article.prototype.processHTML = function(article_node) {
    if (article_node.nodeName !== 'ARTICLE') {
      debug.error('Could not find article content: ' + article_node.innerHTML);

      this.error = true;

      return false;
    }

    // Content is here, so we're loaded
    this.loaded = true;

    // Container used for manipulation and finding things
    var fake_grid = document.createElement('div'),
        fake_column = document.createElement('div');

    // Set up a temporary container for layout
    fake_grid.style.display = 'none';
    dom.addClass(fake_grid, 'offscreen grid');
    dom.addClass(fake_column, 'column');

    // Remove any ID so CSS styles don't affect the elements within
    article_node.removeAttribute('id');

    // Clear the container so node can be the only thing in it
    dom.clearChildren(fake_grid);

    // Set up theme flag, if it exists
    // TODO: Remove compatibility data-grids parameter
    this.theme = article_node.getAttribute('data-theme') ||
      article_node.getAttribute('data-grids') || null;
    if (this.theme) {
      dom.addClass(fake_grid, this.theme);
      dom.addClass(fake_column, this.theme);

      // New theme means grids need to be filtered again
      this.setGrids(this.grids);
    }
    this.extra_classes = dom.classes(article_node);

    // Move the content from the article to the column
    while (article_node.firstChild) {
      fake_column.appendChild(article_node.firstChild);
    }
    fake_grid.appendChild(fake_column);

    // Re-enable visibility, so the browser can measure layout
    fake_column.style.display = 'block';
    fake_grid.style.display = 'block';
    // Container needs to be in tree for measuring
    document.body.appendChild(fake_grid);

    // Construct
    this.content = new Content(fake_column, this.doc);

    // Clean up the DOM
    document.body.removeChild(fake_grid);
    fake_grid.removeChild(fake_column);
    dom.clearChildren(fake_column);

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
  Article.prototype.setGrids = function(all_grids) {
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
   */
  Article.prototype.stretchGrids = function(size) {
    this.eligible_grids = this.grids.filter(function(grid) {
      return grid.capabilityFilter() && grid.sizeFilter(size);
    }).map(function(grid) {
      // Now stretch to the space
      return grid.stretch(size.h);
    });

    // Are there any grids?
    if (!this.eligible_grids.length) {
      debug.error('No eligible grids at ' + size.w + 'x' + size.h);
    }

    // Sort by highest text height (helps with shortcutting in scoring)
    this.eligible_grids.sort(Grid.sort);
  };

  /**
   * Set the maximum size pages in this article are allowed to be
   * @param {{ w: number, h: number }} size
   * @return {boolean} True if a re-layout will be required at this size.
   */
  Article.prototype.setMaxPageSize = function(size) {
    if (!this.maxPageSize ||
        this.maxPageSize.w !== size.w || this.maxPageSize.h !== size.h) {
      this.maxPageSize = size;

      // Check if all the pages of our content will fit at this size
      this.paginationClean =
        dimensions.inSizeRange(/** @type {!treesaver.dimensions.SizeRange} */ (this.constraint), size);
    }

    return !this.paginationClean;
  };

  /**
   * Reset all pagination data and stored pages.
   */
  Article.prototype.resetPagination = function() {
    // Stop all pagination related tasks
    scheduler.clear('paginate');

    // Clear out the old pages
    this.pages = [];
    this.pageCount = 0;

    // Filter and stretch grids to the current size
    if (this.maxPageSize) {
      this.stretchGrids(this.maxPageSize);
    }

    // Our old break record is now useless
    this.br = new BreakRecord();

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
  Article.prototype.paginate = function(bg, index, pos) {
    if (goog.DEBUG) {
      if (!this.content) {
        debug.error('Tried to paginate missing content');
        return;
      }

      if (!this.maxPageSize) {
        debug.error('Tried to paginate without a page size');
        return;
      }

      if (this.paginationComplete) {
        debug.info('Needless call to paginate');
        return;
      }
    }

    // Stop any previous pagination
    // (TODO: What if this conflicts with other articles?)
    scheduler.clear('paginate');

    var page;
    index = index || 0;

    while (!this.br.finished) {
      page = new Page(
        /** @type {!treesaver.layout.Content } */ (this.content),
        this.eligible_grids,
        /** @type {!treesaver.layout.BreakRecord} */ (this.br),
        this.extra_classes
      );

      // Pagination can fail to produce a useful page
      if (page.ignore) {
        if (this.br.finished) {
          debug.info('Page ignored during pagination and article terminated');
        }
        else {
          debug.info('Page ignored during pagination');
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
        events.fireEvent(
          document,
          Article.events.PAGINATIONERROR,
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
        dimensions.mergeSizeRange(/** @type {!treesaver.dimensions.SizeRange} */ (this.constraint), page.size, true);

      if (index && this.pageCount <= index ||
          pos && ((pos === ContentPosition.END) || !pos.lessOrEqual(page.end))) {
        // Not done yet, gotta keep on going
        continue;
      }
      // Check if we can background the rest
      else if (!this.br.finished) {
        if (bg) {
          // Fire progress event, but only when async
          // TODO: Is this the right thing here?
          events.fireEvent(
            document,
            Article.events.PAGINATIONPROGRESS,
            { article: this }
          );

          // Delay rest of pagination to make sure UI thread doesn't hang
          this.paginateAsync(array.toArray(arguments));
        }

        // Break out of loop early
        return;
      }
    }

    // All done, fire completed event
    this.paginationComplete = true;
    events.fireEvent(
      document,
      Article.events.PAGINATIONPROGRESS,
      { article: this, completed: true }
    );
  };

  /**
   * Start asynchronous pagination
   * @param {Array} args Arguments array to pass to the paginate function.
   */
  Article.prototype.paginateAsync = function(args) {
    scheduler.delay(Article.prototype.paginate,
        PAGINATE_DEBOUNCE_TIME, args, 'paginate', this);
  };

  /**
   * Return a width appropriate for use in the chrome for pageWidth
   * elements
   * @return {number}
   */
  Article.prototype.getPageWidth = function() {
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
  Article.prototype.getPages = function(start, count) {
    if (goog.DEBUG) {
      // Do we have our content yet?
      if (!this.loaded) {
        if (!this.loading) {
          debug.error('Tried to getPages on non-loaded article');
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
  Article.prototype.getPageIndex = function(position) {
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
      if (position === ContentPosition.END || !this.pageCount ||
          !position.lessOrEqual(this.pages[this.pageCount - 1].end)) {
        // Need to paginate up to that position
        // TODO: Postpone this
        this.paginateAsync([true, null, position]);
        return -1;
      }
    }

    // Special case for the last page request
    if (position === ContentPosition.END) {
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
    Article.prototype.toString = function() {
      return '[treesaver.ui.Article]';
    };
  }
});
