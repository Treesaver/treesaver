/**
 * @fileoverview Article manager class.
 */

goog.provide('treesaver.ui.ArticleManager');

goog.require('treesaver.debug');
goog.require('treesaver.dimensions');
goog.require('treesaver.dom');
goog.require('treesaver.events');
goog.require('treesaver.microdata');
goog.require('treesaver.network');
goog.require('treesaver.resources');
goog.require('treesaver.storage');
goog.require('treesaver.ui.Article');

/**
 * @const
 * @type {!string}
 */
treesaver.ui.ArticleManager.CACHE_STORAGE_PREFIX = 'cache:';

/**
 * Initialize all content
 * @param {?string} initialHTML
 */
treesaver.ui.ArticleManager.load = function(initialHTML) {
  // Initialize state
  treesaver.ui.ArticleManager.currentArticle = null;
  treesaver.ui.ArticleManager.currentPosition = null;
  treesaver.ui.ArticleManager.currentPageIndex = -1;
  treesaver.ui.ArticleManager.currentArticleIndex = null;
  treesaver.ui.ArticleManager.currentTransitionDirection = null;
  treesaver.ui.ArticleManager.currentPageWidth = null;

  // Data store
  treesaver.ui.ArticleManager.articleOrder = [];
  treesaver.ui.ArticleManager.articleMap = {};
  treesaver.ui.ArticleManager.articles = {};
  treesaver.ui.ArticleManager.toc = [];
  /**
   * @private
   */
  treesaver.ui.ArticleManager.grids_ = treesaver.ui.ArticleManager.getGrids_();

  if (!treesaver.ui.ArticleManager.grids_) {
    treesaver.debug.error('No grids');

    return false;
  }

  // Set up the loading & error pages
  treesaver.ui.ArticleManager.initLoadingPage();
  treesaver.ui.ArticleManager.initErrorPage();

  treesaver.ui.ArticleManager.initialUrl = treesaver.network.stripHash(document.location.href);
  treesaver.ui.ArticleManager.initialHTML = initialHTML;

  // Set the display to the current article?
  if (initialHTML) {
    var initialArticle = new treesaver.ui.Article(treesaver.ui.ArticleManager.initialUrl,
                                          document.title,
                                          treesaver.ui.ArticleManager.grids_,
                                          initialHTML);

    if (!initialArticle.error) {
      treesaver.ui.ArticleManager.articles[treesaver.ui.ArticleManager.initialUrl] = initialArticle;
      treesaver.ui.ArticleManager._setArticle(initialArticle, null, 0, true);
    }
    else {
      treesaver.debug.warn('Error in initial article');

      // Unload and show plain content
      treesaver.core.unload();
    }
  }
  else {
    treesaver.debug.warn('No initial article');
    // What to do here?
  }

  // Set up event handlers
  treesaver.ui.ArticleManager.watchedEvents.forEach(function(evt) {
    treesaver.events.addListener(document, evt, treesaver.ui.ArticleManager.handleEvent);
  });

  window['onpopstate'] = treesaver.ui.ArticleManager.onPopState;

  // Download the table of contents
  treesaver.ui.ArticleManager.generateTOC();

  return true;
};

/**
 * Return an array of Grid objects, using the elements in the resources
 *
 * @private
 * @return {Array.<treesaver.layout.Grid>}
 */
treesaver.ui.ArticleManager.getGrids_ = function() {
  var grids = [];

  treesaver.resources.findByClassName('grid').forEach(function(node) {
    var requires = node.getAttribute('data-requires'),
        grid;
    // Make sure the grid meets our requirements
    if (!requires || treesaver.capabilities.check(requires.split(' '))) {
      // Initialize each grid and store
      grid = new treesaver.layout.Grid(node);
      if (!grid.error) {
        grids.push(grid);
      }
    }
  });

  return grids;
};

/**
 * Initialize the loading page
 */
treesaver.ui.ArticleManager.initLoadingPage = function() {
  var el = treesaver.resources.findByClassName('loading')[0];

  // Craft a dummy page if none is there
  if (!el) {
    el = document.createElement('div');
  }

  // Needed for correct positioning in chrome
  document.body.appendChild(el);
  el.style.top = '50%';
  treesaver.dimensions.setCssPx(el, 'margin-top', -treesaver.dimensions.getOffsetHeight(el) / 2);
  document.body.removeChild(el);

  treesaver.ui.ArticleManager.loadingPageHTML = treesaver.dom.outerHTML(el);
  el = /** @type {!Element} */ (el.cloneNode(true));
  document.body.appendChild(el);
  treesaver.ui.ArticleManager.loadingPageSize = new treesaver.dimensions.Metrics(el);
  document.body.removeChild(el);
};

/**
 * Initialize the error page
 */
treesaver.ui.ArticleManager.initErrorPage = function() {
  var el = treesaver.resources.findByClassName('error')[0];

  // Craft a dummy page if none is there
  if (!el) {
    el = document.createElement('div');
  }

  // Needed for correct positioning in chrome
  document.body.appendChild(el);
  el.style.top = '50%';
  treesaver.dimensions.setCssPx(el, 'margin-top', treesaver.dimensions.getOffsetHeight(el) / 2);
  document.body.removeChild(el);

  treesaver.ui.ArticleManager.errorPageHTML = treesaver.dom.outerHTML(el);
  el = /** @type {!Element} */ (el.cloneNode(true));
  document.body.appendChild(el);
  treesaver.ui.ArticleManager.errorPageSize = new treesaver.dimensions.Metrics(el);
  document.body.removeChild(el);
};

/**
 * Clear references and disconnect events
 */
treesaver.ui.ArticleManager.unload = function() {
  // Clear out state
  treesaver.ui.ArticleManager.currentArticle = null;
  treesaver.ui.ArticleManager.currentPosition = null;
  treesaver.ui.ArticleManager.currentPageIndex = null;
  treesaver.ui.ArticleManager.currentArticleIndex = null;
  treesaver.ui.ArticleManager.currentTransitionDirection = null;

  // Clear data store
  treesaver.ui.ArticleManager.articleOrder = null;
  treesaver.ui.ArticleManager.articleMap = null;
  treesaver.ui.ArticleManager.articles = null;
  treesaver.ui.ArticleManager.toc = null;

  treesaver.ui.ArticleManager.loadingPageHTML = null;
  treesaver.ui.ArticleManager.loadingPageSize = null;

  // Unhook events
  treesaver.ui.ArticleManager.watchedEvents.forEach(function(evt) {
    treesaver.events.removeListener(document, evt, treesaver.ui.ArticleManager.handleEvent);
  });
  window['onpopstate'] = null;
};

/**
 * @type {Object.<string, string>}
 */
treesaver.ui.ArticleManager.events = {
  TOCUPDATED: 'treesaver.tocupdated',
  ARTICLECHANGED: 'treesaver.articlechanged',
  PAGESCHANGED: 'treesaver.pageschanged'
};

/**
 * @enum {number}
 */
treesaver.ui.ArticleManager.transitionDirection = {
  FORWARD: 1,
  NEUTRAL: 0,
  BACKWARD: -1
};

/**
 * @private
 * @type {Array.<string>}
 */
treesaver.ui.ArticleManager.watchedEvents = [
  treesaver.ui.Article.events.LOADED,
  treesaver.ui.Article.events.LOADFAILED,
  treesaver.ui.Article.events.PAGINATIONPROGRESS
];

/**
 * @param {Object} e
 */
treesaver.ui.ArticleManager.handleEvent = function(e) {
  if (e.type === treesaver.ui.Article.events.PAGINATIONPROGRESS) {
    // We have new pages to display
    // TODO
    // Fire event
    treesaver.events.fireEvent(document, treesaver.ui.ArticleManager.events.PAGESCHANGED);
    return;
  }

  if (e.type === treesaver.ui.Article.events.LOADED) {
    // TODO
    // If it's the current article, kick off pagination?
    // If it's the next, kick it off too?
    // Where does size come from?
    treesaver.events.fireEvent(document, treesaver.ui.ArticleManager.events.PAGESCHANGED);
    return;
  }

  if (e.type === treesaver.ui.Article.events.LOADFAILED &&
      e.article === treesaver.ui.ArticleManager.currentArticle) {
    // The current article failed to load, redirect to it
    treesaver.ui.ArticleManager._redirectToArticle(treesaver.ui.ArticleManager.currentArticle);

    return;
  }
};

/**
 * @param {!Event} e  Event with e.state for state storage.
 */
treesaver.ui.ArticleManager.onPopState = function(e) {
  treesaver.debug.info('onPopState event received: ' +
      (e['state'] ? e['state'].url : 'No URL'));

  if (e['state']) {
    var index = e['state'].index;

    if (index || index === 0) {
      treesaver.ui.ArticleManager._setArticle(treesaver.ui.ArticleManager.articleOrder[index],
          e['state'].position, index, true);
    }
    else {
      treesaver.ui.ArticleManager.goToArticleByURL(e['state'].url);
    }
  }
  else {
    // Assume initial article
    treesaver.ui.ArticleManager.goToArticleByURL(treesaver.ui.ArticleManager.initialUrl);
  }
};

/**
 * Finds the URL of the Table of Contents, based on the <link rel="contents" />
 * element. If no such element exists, the current document is used.
 *
 * @private
 * @return {string}
 */
treesaver.ui.ArticleManager.getTOCLocation = function() {
  var link = treesaver.dom.getElementsByProperty('rel', 'contents', 'link')[0],
      url;

  // Is the current document the index?
  // Treat no TOC link as being a self-index
  if (!link || link.getAttribute('rel').indexOf('self') !== -1 || treesaver.network.absoluteURL(link.href) == treesaver.ui.ArticleManager.initialUrl) {
    url = treesaver.ui.ArticleManager.initialUrl;
  }
  else {
    url = treesaver.network.absoluteURL(link.href);
  }

  return url;
};

/**
 * Create the data structure for holding articles
 * Download the table of contents for this issue asynchronously
 * @private
 */
treesaver.ui.ArticleManager.generateTOC = function() {
  var url = treesaver.ui.ArticleManager.getTOCLocation();

  // We can use the original HTML if this is the index, and we are not
  // running from an old cached version while online
  if (url === treesaver.ui.ArticleManager.initialUrl &&
      !(treesaver.network.loadedFromCache() && treesaver.network.isOnline())) {
    // Current article is the up-to-date index
    treesaver.ui.ArticleManager.findTOCLinks(treesaver.ui.ArticleManager.initialHTML, url);
  }
  else {
    // In all other cases, fetch the article, then process
    treesaver.network.get(url, treesaver.ui.ArticleManager.findTOCLinks);
  }
};

/**
 * Search the string of HTML for links that indicate the table of
 * contents. Then update the internal TOC storage
 *
 * @private
 * @param {?string} html String of HTML which may contain links.
 * @param {string} toc_url URL of the TOC.
 */
treesaver.ui.ArticleManager.findTOCLinks = function(html, toc_url) {
  var initialArticleIsTOC = (toc_url === treesaver.ui.ArticleManager.initialUrl);

  if (html) {
    // Don't use storage when native
    if (!WITHIN_IOS_WRAPPER) {
      // Cache the result no matter what
      treesaver.storage.set(treesaver.ui.ArticleManager.CACHE_STORAGE_PREFIX + toc_url,
          html, true);
    }

    // If the initial was loaded from the cache, we could have stale content in the DOM
    if (initialArticleIsTOC && treesaver.network.loadedFromCache()) {
      // Content would only be new if we are online
      if (treesaver.network.isOnline()) {
        // Re-process the current article with the updated content
        treesaver.ui.ArticleManager.currentArticle.processHTML(html);
        // Make sure chrome re-queries pages
        treesaver.events.fireEvent(document, treesaver.ui.ArticleManager.events.PAGESCHANGED);
      }
    }
  }
  else {
    // Don't use storage when native
    if (!WITHIN_IOS_WRAPPER) {
      // TOC failed to load, check the cache
      html = treesaver.storage.get(treesaver.ui.ArticleManager.CACHE_STORAGE_PREFIX + toc_url);
    }

    if (!html) {
      // We don't have content for a TOC, so there is nothing more we can do
      return;
    }
  }

  var unique_urls = [],
      foundTOC = false;

  treesaver.ui.ArticleManager.parseTOC(/** @type {!string} */ (html));

  treesaver.ui.ArticleManager.toc.forEach(function(item) {
    var url,
        article,
        i;

    // data-properties=self is used by the TOC to indicate its position in the article
    // order. Make sure to use the TOC url we already computed in order to avoid
    // duplicates such as '/' and '/index.html'.
    if (item.flags['self']) {
      url = toc_url;
      item.fields.url = toc_url;
      foundTOC = true;
    }
    else {
      url = treesaver.network.absoluteURL(item.fields['url']);
    }

    article = treesaver.ui.ArticleManager.articles[url];
    i = treesaver.ui.ArticleManager.articleOrder.length;

    // Have we seen this URL before?
    if (!article) {
      // Have not seen the url, create a new article and store
      article = new treesaver.ui.Article(url, item.fields['title'] || '', treesaver.ui.ArticleManager.grids_);
      treesaver.ui.ArticleManager.articles[url] = article;
    }

    // Now store the indicies where the article occurs (since an article can appear
    // multiple times)
    if (!treesaver.ui.ArticleManager.articleMap[url]) {
      // First time seeing the article
      treesaver.ui.ArticleManager.articleMap[url] = [i];
      unique_urls.push(treesaver.ui.ArticleManager.CACHE_STORAGE_PREFIX + url);

      if (url === treesaver.ui.ArticleManager.initialUrl) {
        // Current article is initial
        treesaver.ui.ArticleManager.currentArticleIndex = i;
      }
    }
    else {
      // Add another occurence
      treesaver.ui.ArticleManager.articleMap[url].push(i);
    }

    // Add into the order
    treesaver.ui.ArticleManager.articleOrder.push(article);
  });

  // Clear out old article storage
  if (!WITHIN_IOS_WRAPPER) {
    treesaver.storage.clean(treesaver.ui.ArticleManager.CACHE_STORAGE_PREFIX, unique_urls);
  }

  // TODO: Fire an event (let's chrome know it can display)
  treesaver.events.fireEvent(document, treesaver.ui.ArticleManager.events.TOCUPDATED);
};

/**
 * Parse the TOC using the microdata API. Out of necessity we
 * append the container node to the document first, and remove
 * it afterwards.
 *
 * @param {!string} html The string to find TOC content in.
 * @private
 */
treesaver.ui.ArticleManager.parseTOC = function(html) {
  var container = document.createElement('div'),
      items = [];

  // Must have container connected to tree for HTML5 parsing in IE
  if (SUPPORT_IE) {
    container.className = 'offscreen';
    document.body.appendChild(container);
  }

  container.innerHTML = html;
  items = treesaver.microdata.getJSONItems(null, container);

  treesaver.ui.ArticleManager.toc = items.map(function(item) {
    var keys = Object.keys(item.properties),
        result = {
          fields: {},
          flags: item.flags || {}
        };
    keys.forEach(function(key) {
      result.fields[key] = item.properties[key][0];
    });
    return result;
  });

  // Remove from tree if using HTML5 shiv
  if (SUPPORT_IE) {
    document.body.removeChild(container);
  }
};

/**
 * Can the user go to the previous page?
 *
 * @return {boolean}
 */
treesaver.ui.ArticleManager.canGoToPreviousPage = function() {
  // Do we know what page we are on?
  if (treesaver.ui.ArticleManager.currentPageIndex !== -1) {
    // Page 2 and above can always go one back
    if (treesaver.ui.ArticleManager.currentPageIndex >= 1) {
      return true;
    }
    else {
      // If on the first page, depends on whether there's another article
      return treesaver.ui.ArticleManager.canGoToPreviousArticle();
    }
  }
  else {
    // Don't know the page number, so can only go back a page if we're
    // on the first page
    return !treesaver.ui.ArticleManager.currentPosition &&
            treesaver.ui.ArticleManager.canGoToPreviousArticle();
  }
};

/**
 * Go to the previous page in the current article. If we are at
 * the first page of the article, go to the last page of the previous
 * article
 * @return {boolean} False if there is no previous page or article.
 */
treesaver.ui.ArticleManager.previousPage = function() {
  if (goog.DEBUG) {
    if (!treesaver.ui.ArticleManager.currentArticle) {
      treesaver.debug.error('Tried to go to previous article without an article');
      return false;
    }
  }

  // TODO: Try to re-use logic from canGoToPreviousPage
  if (treesaver.ui.ArticleManager.currentPageIndex === -1) {
    if (!treesaver.ui.ArticleManager.currentPosition) {
      if (treesaver.ui.ArticleManager.previousArticle(true)) {
        return true;
      }
    }

    // We have no idea what page we're on, so we can't go back a page
    // TODO: Is there something sane to do here?
    return false;
  }

  var new_index = treesaver.ui.ArticleManager.currentPageIndex - 1;

  if (new_index < 0) {
    // Go to the previous article, if it exists
    if (treesaver.ui.ArticleManager.previousArticle(true)) {
      return true;
    }

    // It doesn't exist, so just stay on the first page
    // No change in state, can return now
    return false;
  }

  treesaver.ui.ArticleManager.currentPageIndex = new_index;

  // Clear the internal position since we're on a new page
  treesaver.ui.ArticleManager.currentPosition = null;

  // Set the transition direction
  treesaver.ui.ArticleManager.currentTransitionDirection =
    treesaver.ui.ArticleManager.transitionDirection.BACKWARD;

  // Fire the change event
  treesaver.events.fireEvent(document, treesaver.ui.ArticleManager.events.PAGESCHANGED);

  return true;
};

/**
 * Can the user go to the next page?
 *
 * @return {boolean}
 */
treesaver.ui.ArticleManager.canGoToNextPage = function() {
  // Do we know what page we are on?
  if (treesaver.ui.ArticleManager.currentPageIndex !== -1) {
    // Do we know there are more pages left?
    if (treesaver.ui.ArticleManager.currentPageIndex <
        treesaver.ui.ArticleManager.currentArticle.pageCount - 1) {
      return true;
    }
    else {
      return treesaver.ui.ArticleManager.currentArticle.paginationComplete &&
             treesaver.ui.ArticleManager.canGoToNextArticle();
    }
  }
  else {
    // Perhaps we're on the last page of the article?
    if (treesaver.ui.ArticleManager.currentPosition === treesaver.layout.ContentPosition.END) {
      return treesaver.ui.ArticleManager.canGoToNextArticle();
    }
    else {
      // We have no idea what page we are on, so we don't know if we can advance
      return false;
    }
  }
};

/**
 * Go to the next page in the current article. If we are at
 * the last page of the article, go to the first page of the next
 * article
 * @return {boolean} False if there is no previous page or article.
 */
treesaver.ui.ArticleManager.nextPage = function() {
  if (goog.DEBUG) {
    if (!treesaver.ui.ArticleManager.currentArticle) {
      treesaver.debug.error('Tried to go to next page without an article');
      return false;
    }
  }

  if (treesaver.ui.ArticleManager.currentPageIndex === -1) {
    if (treesaver.ui.ArticleManager.currentPosition === treesaver.layout.ContentPosition.END) {
      if (treesaver.ui.ArticleManager.nextArticle()) {
        return true;
      }
    }

    // We have no idea what page we're on, so we can't go to the next page
    // TODO: Is there something sane to do here?
    return false;
  }

  var new_index = treesaver.ui.ArticleManager.currentPageIndex + 1;

  if (new_index >= treesaver.ui.ArticleManager.currentArticle.pageCount) {
    if (treesaver.ui.ArticleManager.currentArticle.paginationComplete) {
      // Go to the next article, if it exists
      if (treesaver.ui.ArticleManager.nextArticle()) {
        return true;
      }

      // It doesn't exist, so just stay on the current page
      // No change in state, can return now
      return false;
    }

    // We know there will be a next page, but we don't know
    // anything else yet so stay put
    // No change in state, can return now
    return false;
  }

  // Go to our new index
  treesaver.ui.ArticleManager.currentPageIndex = new_index;

  // Clear the internal position since we're on a new page
  treesaver.ui.ArticleManager.currentPosition = null;

  // Set the transition direction
  treesaver.ui.ArticleManager.currentTransitionDirection =
    treesaver.ui.ArticleManager.transitionDirection.FORWARD;

  // Fire the change event
  treesaver.events.fireEvent(document, treesaver.ui.ArticleManager.events.PAGESCHANGED);

  return true;
};

/**
 * Is there a previous article to go to?
 *
 * @return {boolean}
 */
treesaver.ui.ArticleManager.canGoToPreviousArticle = function() {
  return !!treesaver.ui.ArticleManager.currentArticleIndex;
};

/**
 * Go to the beginning of previous article in the flow
 * @param {boolean=} end Go to the end of the article.
 * @param {boolean=} fetch Only return the article, don't move.
 * @return {treesaver.ui.Article} False if there is no next article.
 */
treesaver.ui.ArticleManager.previousArticle = function(end, fetch) {
  if (!treesaver.ui.ArticleManager.canGoToPreviousArticle()) {
    return null;
  }

  var index = treesaver.ui.ArticleManager.currentArticleIndex - 1,
      article = treesaver.ui.ArticleManager.articleOrder[index];

  return fetch ? article :
    treesaver.ui.ArticleManager._setArticle(article, end ? treesaver.layout.ContentPosition.END : null, index);
};

/**
 * Is there a next article to go to?
 *
 * @return {boolean}
 */
treesaver.ui.ArticleManager.canGoToNextArticle = function() {
  return !!((treesaver.ui.ArticleManager.currentArticleIndex ||
          treesaver.ui.ArticleManager.currentArticleIndex === 0) &&
          treesaver.ui.ArticleManager.currentArticleIndex <
          treesaver.ui.ArticleManager.articleOrder.length - 1);
};

/**
 * Go to the beginning of next article in the flow
 * @param {boolean=} fetch Only return the article, don't move.
 * @return {treesaver.ui.Article} The next article.
 */
treesaver.ui.ArticleManager.nextArticle = function(fetch) {
  if (!treesaver.ui.ArticleManager.canGoToNextArticle()) {
    return null;
  }

  var index = treesaver.ui.ArticleManager.currentArticleIndex + 1,
      article = treesaver.ui.ArticleManager.articleOrder[index];

  return fetch ? article :
    treesaver.ui.ArticleManager._setArticle(article, null, index);
};

/**
 * Go to the article with the given URL, if it exists. Return false if
 * it does not exist
 *
 * @param {!string} url
 * @param {treesaver.layout.ContentPosition=} pos
 * @return {boolean} True if successful.
 */
treesaver.ui.ArticleManager.goToArticleByURL = function(url, pos) {
  var index = treesaver.ui.ArticleManager._getArticleIndex(url),
      article;

  if (!index && index !== 0) {
    return false;
  }

  article = treesaver.ui.ArticleManager.articleOrder[index];
  return treesaver.ui.ArticleManager._setArticle(article, null, index);
};

/**
 * Retrieve an array of pages around the current reading position
 *
 * @param {!treesaver.dimensions.Size} maxSize Maximum allowed size of a page.
 * @param {number}                     buffer  Number of pages on each side of
 *                                             page to retrieve.
 * @return {Array.<?treesaver.layout.Page>} Array of pages, some may be null.
 */
treesaver.ui.ArticleManager.getPages = function(maxSize, buffer) {
  // Fetching pages resets our transition direction
  treesaver.ui.ArticleManager.currentTransitionDirection =
    treesaver.ui.ArticleManager.transitionDirection.NEUTRAL;

  // Set the page size
  if (treesaver.ui.ArticleManager.currentArticle.setMaxPageSize(maxSize)) {
    // Re-layout is required, meaning our pageIndex is worthless
    treesaver.ui.ArticleManager.currentPageIndex = -1;
    // As is the page width
    treesaver.ui.ArticleManager.currentPageWidth = 0;
  }

  // First, let's implement a single page
  var pages = [],
      prevArticle,
      nextArticle,
      startIndex,
      pageCount = 2 * buffer + 1,
      missingPageCount,
      i, j, len;

  // What is the base page?
  if (treesaver.ui.ArticleManager.currentPageIndex === -1) {
    // Look up by position
    treesaver.ui.ArticleManager.currentPageIndex = treesaver.ui.ArticleManager.currentArticle.
      getPageIndex(treesaver.ui.ArticleManager.currentPosition);

    if (treesaver.ui.ArticleManager.currentPageIndex === -1) {
      // If we _still_ don't know the page index, well we need to return blanks
      pages.length = pageCount;
      // One loading page will suffice
      pages[buffer] = treesaver.ui.ArticleManager._createLoadingPage();
      // All done here
      return pages;
    }
  }

  // First page to be requested in current article
  startIndex = treesaver.ui.ArticleManager.currentPageIndex - buffer;

  if (startIndex < 0) {
    prevArticle = treesaver.ui.ArticleManager.previousArticle(false, true);

    if (prevArticle && prevArticle.content && prevArticle.paginationComplete) {
      pages = prevArticle.getPages(startIndex, -startIndex);
    }
    else {
      // Previous article isn't there or isn't ready
      for (i = 0, len = -startIndex; i < len; i += 1) {
        // Don't show loading page, looks weird in the UI and we're not loading
        pages[i] = null;
      }
    }

    missingPageCount = pageCount + startIndex;
    startIndex = 0;
  }
  else {
    missingPageCount = pageCount;
  }

  // Fetch the other pages
  pages = pages.concat(treesaver.ui.ArticleManager.currentArticle.
      getPages(startIndex, missingPageCount));

  missingPageCount = pageCount - pages.length;

  // Do we need to get pages from the next article?
  if (missingPageCount) {
    nextArticle = treesaver.ui.ArticleManager.nextArticle(true);

    if (nextArticle) {
      if (!nextArticle.content) {
        treesaver.ui.ArticleManager._loadArticle(nextArticle);
        // Set size only on first load so pagination can happen
        nextArticle.setMaxPageSize(maxSize);
        // Expand array. Will fill in loading pages below
        pages.length = pageCount;
      }
      else {
        // Always grab starting at the first page
        pages = pages.
          concat(nextArticle.getPages(0, missingPageCount));
      }
    }
    else {
      // No next article = leave blank
    }
  }

  // Use pages.length, not page count to avoid placing a loading page when
  // there isn't a next article
  for (i = buffer, len = pages.length; i < len; i += 1) {
    if (!pages[i]) {
      if (!treesaver.ui.ArticleManager.currentArticle.error) {
        pages[i] = treesaver.ui.ArticleManager._createLoadingPage();
      }
      else {
        pages[i] = treesaver.ui.ArticleManager._createErrorPage();
      }
    }
  }

  // Set our position if we don't have one
  if (!treesaver.ui.ArticleManager.currentPosition ||
      treesaver.ui.ArticleManager.currentPosition === treesaver.layout.ContentPosition.END) {
    // Loading/error pages don't have markers
    if (pages[buffer] && pages[buffer].begin) {
      treesaver.ui.ArticleManager.currentPosition = pages[buffer].begin;
    }
  }

  if (!treesaver.ui.ArticleManager.currentPageWidth) {
    // Set only if it's a real page
    treesaver.ui.ArticleManager.currentPageWidth =
      treesaver.ui.ArticleManager.currentArticle.getPageWidth();
  }

  // Clone any duplicates so we always have unique nodes
  for (i = 0; i < pages.length; i += 1) {
    for (j = i + 1; j < pages.length; j += 1) {
      if (pages[i] === pages[j]) {
        pages[j] = pages[i].clone();
      }
    }
  }

  return pages;
};

/**
 * Return the URL to the current article
 * @return {string}
 */
treesaver.ui.ArticleManager.getCurrentUrl = function() {
  return treesaver.ui.ArticleManager.currentArticle.url;
};

/**
 * Get the page number (1-based) of the current page
 * @return {number}
 */
treesaver.ui.ArticleManager.getCurrentPageNumber = function() {
  return (treesaver.ui.ArticleManager.currentPageIndex + 1) || 1;
};

/**
 * Get the number of pages in the current article
 * @return {number}
 */
treesaver.ui.ArticleManager.getCurrentPageCount = function() {
  return treesaver.ui.ArticleManager.currentArticle.pageCount || 1;
};

/**
 * Get the number of pages in the current article
 * @return {number}
 */
treesaver.ui.ArticleManager.getCurrentPageWidth = function() {
  return treesaver.ui.ArticleManager.currentPageWidth;
};

/**
 * Get the current transition direction
 * @return {number}
 */
treesaver.ui.ArticleManager.getCurrentTransitionDirection = function() {
  return treesaver.ui.ArticleManager.currentTransitionDirection;
};

/**
 * Get the figure that corresponds to the given element in the current
 * article
 *
 * @param {!Element} el
 * @return {?treesaver.layout.Figure}
 */
treesaver.ui.ArticleManager.getFigure = function(el) {
  var figureIndex = parseInt(el.getAttribute('data-figureindex'), 10);

  if (isNaN(figureIndex)) {
    return null;
  }

  // TODO: Refactor this
  return treesaver.ui.ArticleManager.currentArticle.content.figures[figureIndex];
};


/**
 * Get the current TOC.
 * @return {!Array.<Object>} An array of microdata items
 * representing the TOC.
 */
treesaver.ui.ArticleManager.getCurrentTOC = function() {
  return treesaver.ui.ArticleManager.toc || [];
};

/**
 * @private
 * @param {!string} url
 * @param {boolean=} fwd
 * @return {?number}
 */
treesaver.ui.ArticleManager._getArticleIndex = function(url, fwd) {
  var locations = treesaver.ui.ArticleManager.articleMap[url],
      i, index;

  if (!locations || !locations.length) {
    return null;
  }
  else if (locations.length === 1) {
    return locations[0];
  }
  else {
    i = locations.length - 1;
    while (i >= 0) {
      index = locations[i];

      if (index === treesaver.ui.ArticleManager.currentArticleIndex) {
        return index;
      }

      if (index < treesaver.ui.ArticleManager.currentArticleIndex) {
        return fwd && i !== locations.length - 1 ? locations[i + 1]
                                                          : index;
      }

      i -= 1;
    }

    return index;
  }
};

/**
 * Redirects the browser to the URL for the given article
 * @private
 * @param {!treesaver.ui.Article} article
 */
treesaver.ui.ArticleManager._redirectToArticle = function(article) {
  if (treesaver.network.isOnline()) {
    // TODO: Any clean up not in unload?
    document.location = article.url;
  }
  else {
    treesaver.debug.error('Tried to redirect to an article while offline');
  }
};

/**
 * Load the content for an article
 * @private
 * @param {!treesaver.ui.Article} article
 */
treesaver.ui.ArticleManager._loadArticle = function(article) {
  // Don't try to load multiple times (duh)
  if (article.loading) {
    return;
  }

  // Set flag so we don't try to paginate, etc before content loads
  article.loading = true;

  if (!WITHIN_IOS_WRAPPER) {
    var cached_text =
      /** @type {?string} */
      (treesaver.storage.get(treesaver.ui.ArticleManager.CACHE_STORAGE_PREFIX + article.url));

    if (cached_text) {
      article.processHTML(cached_text);

      // Only for article manager?
      // TODO: Don't use events for this?
      treesaver.events.fireEvent(document, treesaver.ui.Article.events.LOADED, { article: article });
    }
  }

  treesaver.debug.info('loadArticle: Downloading article: ' + article.url);

  treesaver.network.get(article.url, function(text) {
    article.loading = false;

    if (!text) {
      if (WITHIN_IOS_WRAPPER || !cached_text) {
        treesaver.debug.info('loadArticle: Load failed, no content: ' + article.url);
        // Fire event
        article.loadFailed = true;
        // TODO: Don't use events for this?
        treesaver.events.fireEvent(document, treesaver.ui.Article.events.LOADFAILED,
          { article: article });
        return;
      }
      else {
        // Stick with cached content
        treesaver.debug.log('Using cached content for article: ' + article.url);
      }
    }
    else if (WITHIN_IOS_WRAPPER || cached_text !== text) {
      if (!WITHIN_IOS_WRAPPER) {
        treesaver.debug.log('Fetched content newer than cache for article: ' + article.url);

        // Save the HTML in the cache
        treesaver.storage.set(treesaver.ui.ArticleManager.CACHE_STORAGE_PREFIX + article.url,
            text, true);
      }

      treesaver.debug.log('Processing HTML content for article: ' + article.url);

      article.processHTML(text);

      // Only for article manager?
      // TODO: Don't use events for this?
      treesaver.events.fireEvent(document, treesaver.ui.Article.events.LOADED, { article: article });
    }
    else {
      treesaver.debug.log('Fetched content same as cached');
    }
  });
};

/**
 * Move to the supplied article
 * @private
 * @param {!treesaver.ui.Article} article
 * @param {treesaver.layout.ContentPosition} pos
 * @param {number=} index
 * @param {boolean=} noHistory
 * @return {boolean} True if successful.
 */
treesaver.ui.ArticleManager._setArticle = function(article, pos, index, noHistory) {
  // TODO: Assert not null
  if (!article) {
    return false;
  }

  // Check if it's the same as the current article
  if (treesaver.ui.ArticleManager.currentArticle === article) {
    // Might be an index change, in which case we should still update
    // the index
    if (index === treesaver.ui.ArticleManager.currentArticleIndex) {
      // Same article and index, nothing to do but still counts as a success
      return true;
    }
    else {
      // TODO: What should UI do with an index change?
    }
  }

  // Change the window/tab title
  if (article.title) {
    document.title = article.title;
  }

  treesaver.ui.ArticleManager.currentArticle = article;
  // Setting article changes position and pageIndex
  treesaver.ui.ArticleManager._setPosition(pos);
  treesaver.ui.ArticleManager.currentPageIndex = -1;

  // Load the article, if it hasn't been loaded already
  if (!article.loaded) {
    treesaver.ui.ArticleManager._loadArticle(article);
  }
  else if (article.error) {
    // Article didn't load successfully on previous attempt
    treesaver.ui.ArticleManager._redirectToArticle(article);
    return false;
  }

  // Set the index
  if (index || index === 0) {
    // Set the transition direction (assume not neutral)
    treesaver.ui.ArticleManager.currentTransitionDirection =
      (treesaver.ui.ArticleManager.currentArticleIndex > index) ?
      treesaver.ui.ArticleManager.transitionDirection.BACKWARD :
      treesaver.ui.ArticleManager.transitionDirection.FORWARD;

    treesaver.ui.ArticleManager.currentArticleIndex = index;
  }
  else {
    treesaver.ui.ArticleManager.currentTransitionDirection =
      treesaver.ui.ArticleManager.transitionDirection.NEUTRAL;
    treesaver.ui.ArticleManager.currentArticleIndex =
      treesaver.ui.ArticleManager._getArticleIndex(article.url);
  }

  // Update the browser URL, but only if we are supposed to
  if (!noHistory) {
    treesaver.history.pushState({
      index: index,
      url: article.url,
      position: pos
    }, article.title, article.path);
  }
  else {
    treesaver.history.replaceState({
      index: index,
      url: article.url,
      position: pos
    }, article.title, article.path);
  }

  // Fire events
  treesaver.events.fireEvent(document, treesaver.ui.ArticleManager.events.PAGESCHANGED);
  treesaver.events.fireEvent(document, treesaver.ui.ArticleManager.events.ARTICLECHANGED, {
    article: article,
    'url': article.url,
    'path': article.path
  });

  return true;
};

/**
 * @private
 * @param {treesaver.layout.ContentPosition} position
 */
treesaver.ui.ArticleManager._setPosition = function(position) {
  if (treesaver.ui.ArticleManager.currentPosition === position) {
    // Ignore spurious
    return;
  }

  treesaver.ui.ArticleManager.currentPosition = position;
  // TODO: Automatically query?
  treesaver.ui.ArticleManager.currentPageIndex = -1;
};

/**
 * Generate a loading page
 * @private
 * @return {treesaver.layout.Page}
 */
treesaver.ui.ArticleManager._createLoadingPage = function() {
  // Constuct a mock loading page
  // TODO: Make this size reasonably
  return /** @type {treesaver.layout.Page} */ ({
    activate: treesaver.layout.Page.prototype.activate,
    deactivate: treesaver.layout.Page.prototype.deactivate,
    html: treesaver.ui.ArticleManager.loadingPageHTML,
    size: treesaver.ui.ArticleManager.loadingPageSize
  });
};

/**
 * Generate an error page
 * @private
 * @return {treesaver.layout.Page}
 */
treesaver.ui.ArticleManager._createErrorPage = function() {
  // Constuct a mock loading page
  // TODO: Make this size reasonably
  return /** @type {treesaver.layout.Page} */ ({
    activate: treesaver.layout.Page.prototype.activate,
    deactivate: treesaver.layout.Page.prototype.deactivate,
    html: treesaver.ui.ArticleManager.errorPageHTML,
    size: treesaver.ui.ArticleManager.errorPageSize
  });
};

// Expose functions when hosted within iOS wrapper
if (WITHIN_IOS_WRAPPER) {
  goog.exportSymbol('treesaver.canGoToNextPage', treesaver.ui.ArticleManager.canGoToNextPage);
  goog.exportSymbol('treesaver.canGoToPreviousPage', treesaver.ui.ArticleManager.canGoToPreviousPage);
  goog.exportSymbol('treesaver.canGoToNextArticle', treesaver.ui.ArticleManager.canGoToNextArticle);
  goog.exportSymbol('treesaver.canGoToPreviousArticle', treesaver.ui.ArticleManager.canGoToPreviousArticle);
  goog.exportSymbol('treesaver.getCurrentUrl', treesaver.ui.ArticleManager.getCurrentUrl);
  goog.exportSymbol('treesaver.getCurrentPageNumber', treesaver.ui.ArticleManager.getCurrentPageNumber);
  goog.exportSymbol('treesaver.getCurrentPageCount', treesaver.ui.ArticleManager.getCurrentPageCount);
  goog.exportSymbol('treesaver.goToArticleByURL', treesaver.ui.ArticleManager.goToArticleByURL);
}
