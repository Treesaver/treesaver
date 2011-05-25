/**
 * @fileoverview Article manager class.
 */

goog.provide('treesaver.ui.ArticleManager');

goog.require('treesaver.debug');
goog.require('treesaver.dimensions');
goog.require('treesaver.dom');
goog.require('treesaver.events');
goog.require('treesaver.network');
goog.require('treesaver.resources');
goog.require('treesaver.storage');
goog.require('treesaver.ui.Article');
goog.require('treesaver.ui.ArticlePosition');
goog.require('treesaver.ui.Document');
goog.require('treesaver.ui.Index');
goog.require('treesaver.uri');

/**
 * Initialize all content
 * @param {?string} initialHTML
 */
treesaver.ui.ArticleManager.load = function(initialHTML) {
  // Initialize state
  treesaver.ui.ArticleManager.currentPageIndex = -1;
  treesaver.ui.ArticleManager.currentDocumentIndex = -1;
  treesaver.ui.ArticleManager.currentArticlePosition = treesaver.ui.ArticlePosition.BEGINNING;
  // Initial values are meaningless, just annotate here
  /** @type {treesaver.ui.Document} */
  treesaver.ui.ArticleManager.currentDocument;
  /** @type {treesaver.layout.ContentPosition} */
  treesaver.ui.ArticleManager.currentPosition;
  /** @type {treesaver.ui.ArticleManager.transitionDirection} */
  treesaver.ui.ArticleManager.currentTransitionDirection;
  /** @type {number} */
  treesaver.ui.ArticleManager.currentPageWidth;

  /**
   * TODO: Mark this as private once again when reference from document.js is removed
   */
  treesaver.ui.ArticleManager.grids_ = treesaver.ui.ArticleManager.getGrids_();

  if (!treesaver.ui.ArticleManager.grids_) {
    treesaver.debug.error('No grids');

    return false;
  }

  // TODO: Store hash, so we can use it to jump directly to an article
  treesaver.ui.ArticleManager.initialDocument = new treesaver.ui.Document(treesaver.uri.stripHash(document.location.href), {});

  if (initialHTML) {
    treesaver.ui.ArticleManager.initialDocument.articles = treesaver.ui.ArticleManager.initialDocument.parse(initialHTML);
    treesaver.ui.ArticleManager.initialDocument.title = document.title;
    treesaver.ui.ArticleManager.initialDocument.loaded = true;
  }

  // Set up event listener for the index
  treesaver.events.addListener(document, treesaver.ui.Index.events.LOADED, treesaver.ui.ArticleManager.onIndexLoad);

  // Create an index instance. Note that getIndexUrl() may fail, causing the LOADFAILED handler to be called.
  treesaver.ui.ArticleManager.index = new treesaver.ui.Index(treesaver.ui.ArticleManager.getIndexUrl());

  // Append the initial document, so that we have at least something in case loading the index takes a long time or fails.
  treesaver.ui.ArticleManager.index.appendChild(treesaver.ui.ArticleManager.initialDocument);
  treesaver.ui.ArticleManager.index.invalidate();
  treesaver.ui.ArticleManager.index.load();

  // Set the initial document to active
  treesaver.ui.ArticleManager.setCurrentDocument(treesaver.ui.ArticleManager.initialDocument, treesaver.ui.ArticlePosition.BEGINNING, null, 0, true);

  // Set up the loading & error pages
  treesaver.ui.ArticleManager.initLoadingPage();
  treesaver.ui.ArticleManager.initErrorPage();

  // Set up event handlers
  treesaver.ui.ArticleManager.watchedEvents.forEach(function(evt) {
    treesaver.events.addListener(document, evt, treesaver.ui.ArticleManager.handleEvent);
  });

  window['onpopstate'] = treesaver.ui.ArticleManager.onPopState;

  return true;
};

/**
 * Clear references and disconnect events
 */
treesaver.ui.ArticleManager.unload = function() {
  // Clear out state
  treesaver.ui.ArticleManager.currentDocument = null;
  treesaver.ui.ArticleManager.currentPosition = null;
  treesaver.ui.ArticleManager.currentPageIndex = -1;
  treesaver.ui.ArticleManager.currentDocumentIndex = -1;
  treesaver.ui.ArticleManager.currentArticlePosition = null;
  // Invalid clearing for type. TODO: Decide if this is even worth clearing on unload
  //treesaver.ui.ArticleManager.currentTransitionDirection = null;
  //treesaver.ui.ArticleManager.currentPageWidth = null;

  treesaver.ui.ArticleManager.loadingPageHTML = null;
  treesaver.ui.ArticleManager.loadingPageSize = null;

  treesaver.events.removeListener(document, treesaver.ui.Index.events.LOADED, treesaver.ui.ArticleManager.onIndexLoad);

  // Unhook events
  treesaver.ui.ArticleManager.watchedEvents.forEach(function(evt) {
    treesaver.events.removeListener(document, evt, treesaver.ui.ArticleManager.handleEvent);
  });
  window['onpopstate'] = null;
};

treesaver.ui.ArticleManager.onIndexLoad = function (e) {
  var index = e.index,
      docs = index.get(treesaver.ui.ArticleManager.initialDocument.url),
      doc = null;

  // Note that this may get called twice, once from the cache and once from the XHR response
  if (docs.length) {
    // Update the new index with the articles from the initial document, which we have already loaded.
    docs.forEach(function (doc) {
      treesaver.ui.ArticleManager.initialDocument.meta = doc.meta;
      treesaver.ui.ArticleManager.initialDocument.children = doc.children;

      doc.parent.replaceChild(treesaver.ui.ArticleManager.initialDocument, doc);
    });

    treesaver.ui.ArticleManager.currentDocumentIndex = index.getDocumentIndex(treesaver.ui.ArticleManager.initialDocument);

    document.title = treesaver.ui.ArticleManager.initialDocument.meta['title'] || treesaver.ui.ArticleManager.initialDocument.title;
  } else {
    // Whoops, what happens here? We loaded a document, it has an index, but
    // the index does not contain a reference to the document that referenced it.
    // Emit an error for now.
    treesaver.debug.error('onIndexLoad: found index, but the article that refers to the index is not present.');
  }
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
 * @type {Object.<string, string>}
 */
treesaver.ui.ArticleManager.events = {
  ARTICLECHANGED: 'treesaver.articlechanged',
  DOCUMENTCHANGED: 'treesaver.documentchanged',
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
  treesaver.ui.Document.events.LOADED,
  treesaver.ui.Document.events.LOADFAILED,
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

  if (e.type === treesaver.ui.Document.events.LOADED) {
    document.title = treesaver.ui.ArticleManager.currentDocument.meta['title'] || treesaver.ui.ArticleManager.currentDocument.title;
    // TODO
    // If it's the current article, kick off pagination?
    // If it's the next, kick it off too?
    // Where does size come from?
    treesaver.events.fireEvent(document, treesaver.ui.ArticleManager.events.PAGESCHANGED);
    return;
  }

  if (e.type === treesaver.ui.Document.events.LOADFAILED &&
      e.document === treesaver.ui.ArticleManager.currentDocument) {
    // The current article failed to load, redirect to it
    treesaver.ui.ArticleManager.redirectToDocument(treesaver.ui.ArticleManager.currentDocument);

    return;
  }
};

/**
 * @param {!Event} e  Event with e.state for state storage.
 */
treesaver.ui.ArticleManager.onPopState = function(e) {
  var index = -1,
      position = null,
      doc;

  treesaver.debug.info('onPopState event received: ' +
      (e['state'] ? e['state'].url : 'No URL'));

  if (e['state']) {
    index = e['state'].index;
    doc = (index || index === 0) ? 
      treesaver.ui.ArticleManager.index.getDocumentByIndex(index) : null;

    if (doc) {
      position = e['state'].position;

      treesaver.ui.ArticleManager.setCurrentDocument(
        doc,
        treesaver.ui.ArticlePosition.BEGINNING,
        position ? new treesaver.layout.ContentPosition(position.block, position.figure, position.overhang) : null,
        index,
        true
      );
    } else {
      treesaver.ui.ArticleManager.goToDocumentByURL(e['state'].url);
    }
  } else {
    // Assume initial article
    index = treesaver.ui.ArticleManager.index.getDocumentIndex(treesaver.ui.ArticleManager.initialDocument);

    treesaver.ui.ArticleManager.setCurrentDocument(
      treesaver.ui.ArticleManager.initialDocument,
      treesaver.ui.ArticlePosition.BEGINNING,
      null,
      index
    );
  }
};

/**
 * Returns the URL of the index file if available in the initial page.
 * @private
 * @return {?string}
 */
treesaver.ui.ArticleManager.getIndexUrl = function () {
  var link = treesaver.dom.getElementsByProperty('rel', 'index', 'link')[0];

  if (!link) {
    return null;
  }
  return treesaver.network.absoluteURL(link.href);
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
 * Returns true if it is possible to go to a previous article.
 * @return {!boolean}
 */
treesaver.ui.ArticleManager.canGoToPreviousArticle = function () {
  return !!treesaver.ui.ArticleManager.currentArticlePosition.index || treesaver.ui.ArticleManager.canGoToPreviousDocument();
};

/**
 * Is there a previous document to go to?
 *
 * @return {!boolean}
 */
treesaver.ui.ArticleManager.canGoToPreviousDocument = function () {
  return treesaver.ui.ArticleManager.currentDocumentIndex >= 1;
};

/**
 * Go to the beginning of previous document in the flow
 * @param {boolean=} end Go to the end of the document.
 * @param {boolean=} fetch Only return the document, don't move.
 * @return {treesaver.ui.Document} null if there is no next document.
 */
treesaver.ui.ArticleManager.previousDocument = function(end, fetch) {
  if (!treesaver.ui.ArticleManager.canGoToPreviousDocument()) {
    return null;
  }

  var index = treesaver.ui.ArticleManager.currentDocumentIndex - 1,
      doc = treesaver.ui.ArticleManager.index.getDocumentByIndex(index),
      articlePosition = null;

  if (doc.loaded) {
    articlePosition = new treesaver.ui.ArticlePosition(doc.getNumberOfArticles() - 1);
  } else {
    articlePosition = treesaver.ui.ArticlePosition.END;
  }

  return fetch ? doc : treesaver.ui.ArticleManager.setCurrentDocument(doc, articlePosition, end ? treesaver.layout.ContentPosition.END : null, index);
};

/**
 * Go to or fetch the previous article or document.
 * @param {boolean=} end Whether to go to the end of the previous article or document.
 * @param {boolean=} fetch Whether to go to the previous article (or document) or fetch it without navigating to it.
 */
treesaver.ui.ArticleManager.previousArticle = function (end, fetch) {
  if (!treesaver.ui.ArticleManager.canGoToPreviousArticle()) {
    return null;
  }

  if (!!treesaver.ui.ArticleManager.currentArticlePosition.index) {
    var articlePosition = new treesaver.ui.ArticlePosition(treesaver.ui.ArticleManager.currentArticlePosition.index - 1),
        index = treesaver.ui.ArticleManager.currentDocumentIndex,
        doc = /** @type {!treesaver.ui.Document} */ (treesaver.ui.ArticleManager.currentDocument);

    return fetch ? doc : treesaver.ui.ArticleManager.setCurrentDocument(doc, articlePosition, end ? treesaver.layout.ContentPosition.END : null, index);
  } else {
    return treesaver.ui.ArticleManager.previousDocument(end, fetch);
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
    if (!treesaver.ui.ArticleManager.currentDocument) {
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
        treesaver.ui.ArticleManager.currentDocument.articles[treesaver.ui.ArticleManager.currentArticlePosition.index].pageCount - 1) {
      return true;
    } else {
      return treesaver.ui.ArticleManager.currentDocument.articles[treesaver.ui.ArticleManager.currentArticlePosition.index].paginationComplete && treesaver.ui.ArticleManager.canGoToNextArticle();
    }
  } else {
    // Perhaps we're on the last page of the article?
    if (treesaver.ui.ArticleManager.currentPosition === treesaver.layout.ContentPosition.END) {
      return treesaver.ui.ArticleManager.canGoToNextArticle();
    } else {
      // We have no idea what page we are on, so we don't know if we can advance
      return false;
    }
  }
};

/**
 * Is there a next article to go to?
 *
 * @return {boolean}
 */
treesaver.ui.ArticleManager.canGoToNextArticle = function() {
  return (treesaver.ui.ArticleManager.currentArticlePosition.index < treesaver.ui.ArticleManager.currentDocument.getNumberOfArticles() - 1) ||
            treesaver.ui.ArticleManager.canGoToNextDocument();
};

/**
 * Is there a next document to go to?
 * @return {boolean}
 */
treesaver.ui.ArticleManager.canGoToNextDocument = function() {
  return treesaver.ui.ArticleManager.currentDocumentIndex !== -1 &&
          treesaver.ui.ArticleManager.currentDocumentIndex < treesaver.ui.ArticleManager.index.getNumberOfDocuments() - 1;
};

/**
 * Go to the beginning of next document in the flow
 * @param {boolean=} fetch Only return the document, don't move.
 * @return {treesaver.ui.Document} The next document.
 */
treesaver.ui.ArticleManager.nextDocument = function (fetch) {
  if (!treesaver.ui.ArticleManager.canGoToNextDocument()) {
    return null;
  }

  var index = treesaver.ui.ArticleManager.currentDocumentIndex + 1,
      doc = /** @type {!treesaver.ui.Document} */ (treesaver.ui.ArticleManager.index.getDocumentByIndex(index));

  return fetch ? doc : treesaver.ui.ArticleManager.setCurrentDocument(doc, treesaver.ui.ArticlePosition.BEGINNING, null, index);
};

/**
 * Go to or fetch the next article or document.
 * @param {boolean=} fetch Whether to go to the next article (or document) or fetch it without navigating to it.
 */
treesaver.ui.ArticleManager.nextArticle = function (fetch) {
  if (!treesaver.ui.ArticleManager.canGoToNextArticle()) {
    return null;
  }

  if (treesaver.ui.ArticleManager.currentArticlePosition.index < treesaver.ui.ArticleManager.currentDocument.getNumberOfArticles() - 1) {
    var articlePosition = new treesaver.ui.ArticlePosition(treesaver.ui.ArticleManager.currentArticlePosition.index + 1),
        index = treesaver.ui.ArticleManager.currentDocumentIndex,
        doc = /** @type {!treesaver.ui.Document} */ (treesaver.ui.ArticleManager.currentDocument);

    return fetch ? doc : treesaver.ui.ArticleManager.setCurrentDocument(doc, articlePosition, null, index);
  } else {
    return treesaver.ui.ArticleManager.nextDocument(fetch);
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
    if (!treesaver.ui.ArticleManager.currentDocument) {
      treesaver.debug.error('Tried to go to next page without an document');
      return false;
    }
  }

  if (treesaver.ui.ArticleManager.currentPageIndex === -1) {
    if (treesaver.ui.ArticleManager.currentPosition === treesaver.layout.ContentPosition.END) {
      return treesaver.ui.ArticleManager.nextArticle();
    }

    // We have no idea what page we're on, so we can't go to the next page
    // TODO: Is there something sane to do here?
    return false;
  }

  var new_index = treesaver.ui.ArticleManager.currentPageIndex + 1;

  if (new_index >= treesaver.ui.ArticleManager.currentDocument.articles[treesaver.ui.ArticleManager.currentArticlePosition.index].pageCount) {
    if (treesaver.ui.ArticleManager.currentDocument.articles[treesaver.ui.ArticleManager.currentArticlePosition.index].paginationComplete) {
      // Go to the next article or document, if it exists
      return treesaver.ui.ArticleManager.nextArticle();
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
 * Go to the article with the given URL, if it exists. Return false if
 * it does not exist
 *
 * @param {!string} url
 * @param {treesaver.layout.ContentPosition=} pos
 * @return {boolean} True if successful.
 */
treesaver.ui.ArticleManager.goToDocumentByURL = function (url, pos) {
  var articleAnchor = treesaver.uri.parse(url)['anchor'],
      docs = treesaver.ui.ArticleManager.index.get(treesaver.uri.stripHash(url)),
      doc,
      index = -1,
      articlePosition = null;

  if (docs.length !== 0) {
    // Go to the first matching document
    doc = /** @type {!treesaver.ui.Document} */ (docs[0]);

    index = treesaver.ui.ArticleManager.index.getDocumentIndex(doc);

    // If the document is loaded and we have an anchor, we can just look up the desired article index
    if (doc.loaded && articleAnchor) {
      articlePosition = new treesaver.ui.ArticlePosition(doc.getArticleIndex(articleAnchor));
    } else {
      articlePosition = new treesaver.ui.ArticlePosition(0, articleAnchor);
    }

    if (index !== -1) {
      return treesaver.ui.ArticleManager.setCurrentDocument(doc, articlePosition, null, index);
    }
  }
  return false;
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
  treesaver.ui.ArticleManager.currentTransitionDirection = treesaver.ui.ArticleManager.transitionDirection.NEUTRAL;

  if (treesaver.ui.ArticleManager.currentArticlePosition.atEnding()) {
    treesaver.ui.ArticleManager.currentArticlePosition = new treesaver.ui.ArticlePosition(treesaver.ui.ArticleManager.currentDocument.articles.length - 1);
  } else if (treesaver.ui.ArticleManager.currentArticlePosition.isAnchor()) {
    // This will return 0 (meaning the first article) if the anchor is not found.
    treesaver.ui.ArticleManager.currentArticlePosition = new treesaver.ui.ArticlePosition(treesaver.ui.ArticleManager.currentDocument.getArticleIndex(/** @type {string} */(treesaver.ui.ArticleManager.currentArticlePosition.anchor)));
  }

  // Set the page size
  if (treesaver.ui.ArticleManager.currentDocument.articles[treesaver.ui.ArticleManager.currentArticlePosition.index].setMaxPageSize(maxSize)) {
      // Re-layout is required, meaning our pageIndex is worthless
      treesaver.ui.ArticleManager.currentPageIndex = -1;
      // As is the page width
      treesaver.ui.ArticleManager.currentPageWidth = 0;
  }

  // First, let's implement a single page
  var pages = [],
      nextDocument,
      prevDocument,
      startIndex,
      pageCount = 2 * buffer + 1,
      missingPageCount,
      i, j, len;

  // What is the base page?
  if (treesaver.ui.ArticleManager.currentPageIndex === -1) {
    // Look up by position
    treesaver.ui.ArticleManager.currentPageIndex = treesaver.ui.ArticleManager.currentDocument.articles[treesaver.ui.ArticleManager.currentArticlePosition.index].
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
    prevDocument = treesaver.ui.ArticleManager.previousArticle(false, true);

    if (prevDocument && prevDocument === treesaver.ui.ArticleManager.currentDocument) {
      prevDocument.articles[treesaver.ui.ArticleManager.currentArticlePosition.index - 1].setMaxPageSize(maxSize);
      pages = prevDocument.articles[treesaver.ui.ArticleManager.currentArticlePosition.index - 1].getPages(startIndex, -startIndex);
    } else if (prevDocument && prevDocument.loaded && prevDocument.articles[prevDocument.articles.length - 1].paginationComplete) {
      pages = prevDocument.articles[prevDocument.articles.length - 1].getPages(startIndex, -startIndex);
    } else {
      // Previous article isn't there or isn't ready
      for (i = 0, len = -startIndex; i < len; i += 1) {
        // Don't show loading page, looks weird in the UI and we're not loading
        pages[i] = null;
      }
    }

    missingPageCount = pageCount + startIndex;
    startIndex = 0;
  } else {
    missingPageCount = pageCount;
  }

  // Fetch the other pages
  pages = pages.concat(treesaver.ui.ArticleManager.currentDocument.articles[treesaver.ui.ArticleManager.currentArticlePosition.index].
      getPages(startIndex, missingPageCount));

  missingPageCount = pageCount - pages.length;

  // Do we need to get pages from the next document or article?
  if (missingPageCount) {
    nextDocument = treesaver.ui.ArticleManager.nextArticle(true);

    // The next article could either be in this document (a document with more than one article), or in the next document
    if (nextDocument && nextDocument === treesaver.ui.ArticleManager.currentDocument) {
        nextDocument.articles[treesaver.ui.ArticleManager.currentArticlePosition.index + 1].setMaxPageSize(maxSize);
        pages = pages.concat(nextDocument.articles[treesaver.ui.ArticleManager.currentArticlePosition.index + 1].getPages(0, missingPageCount));
    } else if (nextDocument) {
      if (!nextDocument.loaded) {
        nextDocument.load();
        pages.length = pageCount;
      } else {
        nextDocument.articles[0].setMaxPageSize(maxSize);
        pages = pages.concat(nextDocument.articles[0].getPages(0, missingPageCount));
      }
    } else {
      // No next article = leave blank
    }
  }

  // Use pages.length, not page count to avoid placing a loading page when
  // there isn't a next article
  for (i = buffer, len = pages.length; i < len; i += 1) {
    if (!pages[i]) {
      if (!treesaver.ui.ArticleManager.currentDocument.error) {
        pages[i] = treesaver.ui.ArticleManager._createLoadingPage();
      } else {
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
      treesaver.ui.ArticleManager.currentDocument.articles[treesaver.ui.ArticleManager.currentArticlePosition.index].getPageWidth();
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
  return treesaver.ui.ArticleManager.currentDocument.url;
};

/**
 * Returns the current document
 * @return {treesaver.ui.Document}
 */
treesaver.ui.ArticleManager.getCurrentDocument = function () {
  return treesaver.ui.ArticleManager.currentDocument;
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
  if (treesaver.ui.ArticleManager.currentArticlePosition === treesaver.ui.ArticlePosition.END) {
    return 1;
  } else {
    return treesaver.ui.ArticleManager.currentDocument.articles[treesaver.ui.ArticleManager.currentArticlePosition.index].pageCount || 1;
  }
};

/**
 * Return the document number (1-based) of the current document.
 * @return {number}
 */
treesaver.ui.ArticleManager.getCurrentDocumentNumber = function () {
  return (treesaver.ui.ArticleManager.currentDocumentIndex + 1) || 1;
};

/**
 * Return the number of documents in the index.
 * @return {number}
 */
treesaver.ui.ArticleManager.getDocumentCount = function () {
  return treesaver.ui.ArticleManager.index.getNumberOfDocuments();
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
 * @return {treesaver.ui.ArticleManager.transitionDirection}
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
  return treesaver.ui.ArticleManager.currentDocument.articles[treesaver.ui.ArticleManager.currentArticlePosition.index].content.figures[figureIndex];
};

/**
 * Redirects the browser to the URL for the given document
 * @private
 * @param {!treesaver.ui.Document} doc
 */
treesaver.ui.ArticleManager.redirectToDocument = function (doc) {
  if (treesaver.network.isOnline()) {
    document.location = doc.url;
  } else {
    treesaver.debug.error('Tried to redirect to a document while offline');
  }
};

/**
 * @param {!treesaver.ui.Document} doc The document to set as current. Will be loaded if necessary.
 * @param {!treesaver.ui.ArticlePosition} articlePosition The article position within the document. Can be used to set the last article of a document as current, or jump to a specific article within a document.
 * @param {?treesaver.layout.ContentPosition} pos The position within an article.
 * @param {!number} index The index at which the document should be placed.
 * @param {boolean=} noHistory Whether to modify the history or not.
 */
treesaver.ui.ArticleManager.setCurrentDocument = function (doc, articlePosition, pos, index, noHistory) {
  var articleAnchor = null,
      url = null,
      path = null;

  if (!doc) {
    return false;
  }

  articleAnchor = doc.getArticleAnchor(articlePosition && articlePosition.index || 0) || articlePosition.isAnchor() && articlePosition.anchor;
  url = doc.url + (articleAnchor ? '#' + articleAnchor : '');
  path = doc.path + (articleAnchor ? '#' + articleAnchor: '');

  if (doc.equals(treesaver.ui.ArticleManager.currentDocument) &&
      index !== treesaver.ui.ArticleManager.currentDocumentIndex &&
      !treesaver.ui.ArticleManager.currentArticlePosition.equals(articlePosition)) {
    // Same document, but different article
    var article = treesaver.ui.ArticleManager.currentDocument.getArticle(articlePosition.index);

    // Adjust the transition direction
    treesaver.ui.ArticleManager.currentTransitionDirection = (treesaver.ui.ArticleManager.currentArticlePosition.index > articlePosition.index) ?
    treesaver.ui.ArticleManager.transitionDirection.BACKWARD : treesaver.ui.ArticleManager.transitionDirection.FORWARD;

    // Update the article position
    treesaver.ui.ArticleManager.currentArticlePosition = articlePosition;

    treesaver.ui.ArticleManager._setPosition(pos);
    treesaver.ui.ArticleManager.currentPageIndex = -1;

    // Update the browser URL, but only if we are supposed to
    if (!noHistory) {
      treesaver.history.pushState({
        index: index,
        url: url,
        position: pos
      }, doc.meta['title'], path);
    } else {
      treesaver.history.replaceState({
        index: index,
        url: url,
        position: pos
      }, doc.meta['title'], path);
    }

    // Fire the ARTICLECHANGED event
    treesaver.events.fireEvent(document, treesaver.ui.ArticleManager.events.PAGESCHANGED);
    treesaver.events.fireEvent(document, treesaver.ui.ArticleManager.events.ARTICLECHANGED, {
      'article': article
    });
    return true;
  }

  document.title = doc.meta['title'] || doc.title;

  treesaver.ui.ArticleManager.currentDocument = doc;
  treesaver.ui.ArticleManager._setPosition(pos);
  // Changing document/article always changes the current page index
  treesaver.ui.ArticleManager.currentPageIndex = -1;
  treesaver.ui.ArticleManager.currentArticlePosition = articlePosition;

  if (!doc.loaded) {
    doc.load();
  } else if (doc.error) {
    treesaver.ui.ArticleManager.redirectToDocument(doc);
  }

  if (index || index === 0) {
    // Set the transition direction (assume not neutral)
    treesaver.ui.ArticleManager.currentTransitionDirection = (treesaver.ui.ArticleManager.currentDocumentIndex > index) ?
      treesaver.ui.ArticleManager.transitionDirection.BACKWARD : treesaver.ui.ArticleManager.transitionDirection.FORWARD;

    treesaver.ui.ArticleManager.currentDocumentIndex = index;
  } else {
    treesaver.ui.ArticleManager.currentTransitionDirection = treesaver.ui.ArticleManager.transitionDirection.NEUTRAL;
    treesaver.ui.ArticleManager.currentDocumentIndex = treesaver.ui.ArticleManager.index.getDocumentIndex(doc);
  }

  // Update the browser URL, but only if we are supposed to
  if (!noHistory) {
    treesaver.history.pushState({
      index: index,
      url: url,
      position: pos
    }, doc.meta['title'] || '', path);
  } else {
    treesaver.history.replaceState({
      index: index,
      url: url,
      position: pos
    }, doc.meta['title'] || '', path);
  }

  // Fire events
  treesaver.events.fireEvent(document, treesaver.ui.ArticleManager.events.PAGESCHANGED);
  treesaver.events.fireEvent(document, treesaver.ui.ArticleManager.events.DOCUMENTCHANGED, {
    'document': doc,
    'url': url,
    'path': path
  });
  treesaver.events.fireEvent(document, treesaver.ui.ArticleManager.events.ARTICLECHANGED, {
    'article': treesaver.ui.ArticleManager.currentDocument.getArticle(articlePosition && articlePosition.index || 0)
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
  goog.exportSymbol('treesaver.canGoToNextDocument', treesaver.ui.ArticleManager.canGoToNextDocument);
  goog.exportSymbol('treesaver.canGoToPreviousDocument', treesaver.ui.ArticleManager.canGoToPreviousDocument);
  goog.exportSymbol('treesaver.getCurrentUrl', treesaver.ui.ArticleManager.getCurrentUrl);
  goog.exportSymbol('treesaver.getCurrentPageNumber', treesaver.ui.ArticleManager.getCurrentPageNumber);
  goog.exportSymbol('treesaver.getCurrentPageCount', treesaver.ui.ArticleManager.getCurrentPageCount);
  goog.exportSymbol('treesaver.getCurrentDocumentNumber', treesaver.ui.ArticleManager.getCurrentDocumentNumber);
  goog.exportSymbol('treesaver.getDocumentCount', treesaver.ui.ArticleManager.getDocumentCount);
  goog.exportSymbol('treesaver.goToDocumentByURL', treesaver.ui.ArticleManager.goToDocumentByURL);
}
