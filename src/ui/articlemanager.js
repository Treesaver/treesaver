/**
 * @fileoverview Article manager class.
 */

goog.provide('treesaver.ui.ArticleManager');

goog.require('treesaver.capabilities');
goog.require('treesaver.debug');
goog.require('treesaver.dimensions');
goog.require('treesaver.dom');
goog.require('treesaver.events');
goog.require('treesaver.network');
goog.require('treesaver.resources');
goog.require('treesaver.ui.Article');
goog.require('treesaver.ui.ArticlePosition');
goog.require('treesaver.ui.Document');
goog.require('treesaver.ui.Index');
goog.require('treesaver.uri');

goog.scope(function() {
  var ArticleManager = treesaver.ui.ArticleManager,
      capabilities = treesaver.capabilities,
      debug = treesaver.debug,
      dimensions = treesaver.dimensions,
      dom = treesaver.dom,
      events = treesaver.events,
      network = treesaver.network,
      resources = treesaver.resources,
      Article = treesaver.ui.Article,
      ArticlePosition = treesaver.ui.ArticlePosition,
      Document = treesaver.ui.Document,
      Index = treesaver.ui.Index;

  /**
   * Initialize all content
   * @param {?string} initialHTML
   */
  ArticleManager.load = function(initialHTML) {
    // Initialize state
    ArticleManager.currentPageIndex = -1;
    ArticleManager.currentDocumentIndex = -1;
    ArticleManager.currentArticlePosition = ArticlePosition.BEGINNING;
    // Initial values are meaningless, just annotate here
    /** @type {treesaver.ui.Document} */
    ArticleManager.currentDocument;
    /** @type {treesaver.ui.Article} */
    ArticleManager.currentArticle;
    /** @type {treesaver.layout.ContentPosition} */
    ArticleManager.currentPosition;
    /** @type {number} */
    ArticleManager.currentPageWidth;

    /**
     * TODO: Mark this as private once again when reference from document.js is removed
     */
    ArticleManager.grids_ = ArticleManager.getGrids_();

    if (!ArticleManager.grids_) {
      debug.error('No grids');

      return false;
    }

    // TODO: Store hash, so we can use it to jump directly to an article
    ArticleManager.initialDocument = new Document(treesaver.uri.stripHash(document.location.href), {});

    if (initialHTML) {
      ArticleManager.initialDocument.articles = ArticleManager.initialDocument.parse(initialHTML);
      ArticleManager.initialDocument.title = document.title;
      ArticleManager.initialDocument.loaded = true;
    }

    // Set up event listener for the index
    events.addListener(document, Index.events.LOADED, ArticleManager.onIndexLoad);

    // Create an index instance. Note that getIndexUrl() may fail, causing the LOADFAILED handler to be called.
    ArticleManager.index = new Index(ArticleManager.getIndexUrl());

    // Append the initial document, so that we have at least something in case loading the index takes a long time or fails.
    ArticleManager.index.appendChild(ArticleManager.initialDocument);
    ArticleManager.index.update();
    ArticleManager.index.load();

    // Set the initial document to active
    ArticleManager.setCurrentDocument(ArticleManager.initialDocument, ArticlePosition.BEGINNING, null, null, true);

    // Set up the loading & error pages
    ArticleManager.initLoadingPage();
    ArticleManager.initErrorPage();

    // Set up event handlers
    ArticleManager.watchedEvents.forEach(function(evt) {
      events.addListener(document, evt, ArticleManager.handleEvent);
    });

    // popstate is on window, not document
    events.addListener(window, treesaver.history.events.POPSTATE, ArticleManager.handleEvent);

    return true;
  };

  /**
   * Clear references and disconnect events
   */
  ArticleManager.unload = function() {
    // Clear out state
    ArticleManager.currentDocument = null;
    ArticleManager.currentArticle = null;
    ArticleManager.currentPosition = null;
    ArticleManager.currentPageIndex = -1;
    ArticleManager.currentDocumentIndex = -1;
    ArticleManager.currentArticlePosition = null;
    // Invalid clearing for type. TODO: Decide if this is even worth clearing on unload
    //ArticleManager.currentPageWidth = null;

    ArticleManager.loadingPageHTML = null;
    ArticleManager.loadingPageSize = null;

    events.removeListener(document, Index.events.LOADED, ArticleManager.onIndexLoad);

    // Unhook events
    ArticleManager.watchedEvents.forEach(function(evt) {
      events.removeListener(document, evt, ArticleManager.handleEvent);
    });

    events.removeListener(window, treesaver.history.events.POPSTATE, ArticleManager.handleEvent);
  };

  ArticleManager.onIndexLoad = function(e) {
    var index = e.index,
        docs = index.getDocuments(ArticleManager.initialDocument.url),
        doc = null,
        initialDocumentMeta = dom.querySelectorAll('meta[name]');

    // Note that this may get called twice, once from the cache and once from the XHR response
    if (docs.length) {
      // Update the new index with the articles from the initial document, which we have already loaded.
      docs.forEach(function(doc) {
        ArticleManager.initialDocument.meta = doc.meta;
        ArticleManager.initialDocument.contents = doc.contents;
        ArticleManager.initialDocument.requirements = doc.requirements;

        // Copy over the meta data inside the initial document
        initialDocumentMeta.forEach(function (meta) {
          var name = meta.getAttribute('name'),
              content = meta.getAttribute('content');

          if (name && content) {
            doc.meta[name] = content;
          }
        });

        doc.parent.replaceChild(ArticleManager.initialDocument, doc);
      });

      ArticleManager.currentDocumentIndex = index.getDocumentIndex(ArticleManager.initialDocument);

      document.title = ArticleManager.initialDocument.meta['title'] || ArticleManager.initialDocument.title;
    }
    else {
      // Whoops, what happens here? We loaded a document, it has an index, but
      // the index does not contain a reference to the document that referenced it.
      // Emit an error for now.
      debug.error('onIndexLoad: found index, but the article that refers to the index is not present.');
    }
  };

  /**
   * Return an array of Grid objects, using the elements in the resources
   *
   * @private
   * @return {Array.<treesaver.layout.Grid>}
   */
  ArticleManager.getGrids_ = function() {
    var grids = [];

    resources.findByClassName('grid').forEach(function(node) {
      var requires = node.getAttribute('data-requires'),
          grid;
      // Make sure the grid meets our requirements
      if (!requires || capabilities.check(requires.split(' '))) {
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
  ArticleManager.initLoadingPage = function() {
    var el = resources.findByClassName('loading')[0];

    // Craft a dummy page if none is there
    if (!el) {
      el = document.createElement('div');
    }

    // Needed for correct positioning in chrome
    document.body.appendChild(el);
    el.style.top = '50%';
    el.style.left = '50%';
    dimensions.setCssPx(el, 'margin-top', -treesaver.dimensions.getOffsetHeight(el) / 2);
    dimensions.setCssPx(el, 'margin-left', -treesaver.dimensions.getOffsetWidth(el) / 2);
    document.body.removeChild(el);

    ArticleManager.loadingPageHTML = dom.outerHTML(el);
    el = /** @type {!Element} */ (el.cloneNode(true));
    document.body.appendChild(el);
    ArticleManager.loadingPageSize = new dimensions.Metrics(el);
    document.body.removeChild(el);
  };

  /**
   * Initialize the error page
   */
  ArticleManager.initErrorPage = function() {
    var el = resources.findByClassName('error')[0];

    // Craft a dummy page if none is there
    if (!el) {
      el = document.createElement('div');
    }

    // Needed for correct positioning in chrome
    document.body.appendChild(el);
    el.style.top = '50%';
    el.style.left = '50%';
    dimensions.setCssPx(el, 'margin-top', -treesaver.dimensions.getOffsetHeight(el) / 2);
    dimensions.setCssPx(el, 'margin-left', -treesaver.dimensions.getOffsetWidth(el) / 2);
    document.body.removeChild(el);

    ArticleManager.errorPageHTML = dom.outerHTML(el);
    el = /** @type {!Element} */ (el.cloneNode(true));
    document.body.appendChild(el);
    ArticleManager.errorPageSize = new dimensions.Metrics(el);
    document.body.removeChild(el);
  };

  /**
   * @type {Object.<string, string>}
   */
  ArticleManager.events = {
    ARTICLECHANGED: 'treesaver.articlechanged',
    DOCUMENTCHANGED: 'treesaver.documentchanged',
    PAGESCHANGED: 'treesaver.pageschanged'
  };

  /**
   * @private
   * @type {Array.<string>}
   */
  ArticleManager.watchedEvents = [
    Document.events.LOADED,
    Document.events.LOADFAILED,
    Article.events.PAGINATIONPROGRESS
  ];

  /**
   * @param {!Object|!Event} e
   */
  ArticleManager.handleEvent = function(e) {
    if (e.type === Article.events.PAGINATIONPROGRESS) {
      // We have new pages to display
      // TODO
      // Fire event
      events.fireEvent(document, ArticleManager.events.PAGESCHANGED);
      return;
    }

    if (e.type === Document.events.LOADED) {
      document.title = ArticleManager.currentDocument.meta['title'] || ArticleManager.currentDocument.title;
      // TODO
      // If it's the current article, kick off pagination?
      // If it's the next, kick it off too?
      // Where does size come from?
      events.fireEvent(document, ArticleManager.events.PAGESCHANGED);
      return;
    }

    if (e.type === Document.events.LOADFAILED &&
        e.document === ArticleManager.currentDocument) {
      if (capabilities.IS_NATIVE_APP) {
        // Article did not load, for now just ignore
      }
      else {
        // The current article failed to load, redirect to it
        ArticleManager.redirectToDocument(ArticleManager.currentDocument);

        return;
      }
    }

    if (e.type === treesaver.history.events.POPSTATE) {
      ArticleManager.onPopState(/** @type {!Event} */ (e));
      return;
    }
  };

  /**
   * @param {!Event} e  Event with e.state for state storage.
   */
  ArticleManager.onPopState = function(e) {
    var index = -1,
        position = null,
        doc;

    debug.info('onPopState event received: ' +
        (e['state'] ? e['state'].url : 'No URL'));

    if (e['state']) {
      index = e['state'].index;
      doc = (index || index === 0) ?
        ArticleManager.index.getDocumentByIndex(index) : null;

      if (doc) {
        position = e['state'].position;

        ArticleManager.setCurrentDocument(
          doc,
          ArticlePosition.BEGINNING,
          position ? new treesaver.layout.ContentPosition(position.block, position.figure, position.overhang) : null,
          index,
          true
        );
      }
      else {
        ArticleManager.goToDocumentByURL(e['state'].url);
      }
    }
    else {
      // Assume initial article
      index = ArticleManager.index.getDocumentIndex(ArticleManager.initialDocument);

      ArticleManager.setCurrentDocument(
        ArticleManager.initialDocument,
        ArticlePosition.BEGINNING,
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
  ArticleManager.getIndexUrl = function() {
    var link = dom.querySelectorAll('link[rel~=index]')[0];

    if (!link) {
      return null;
    }
    return network.absoluteURL(link.href);
  };

  /**
   * Can the user go to the previous page?
   *
   * @return {boolean}
   */
  ArticleManager.canGoToPreviousPage = function() {
    // Do we know what page we are on?
    if (ArticleManager.currentPageIndex !== -1) {
      // Page 2 and above can always go one back
      if (ArticleManager.currentPageIndex >= 1) {
        return true;
      }
      else {
        // If on the first page, depends on whether there's another article
        return ArticleManager.canGoToPreviousArticle();
      }
    }
    else {
      // Don't know the page number, so can only go back a page if we're
      // on the first page
      return !ArticleManager.currentPosition &&
              ArticleManager.canGoToPreviousArticle();
    }
  };

  /**
   * Returns true if it is possible to go to a previous article.
   * @return {!boolean}
   */
  ArticleManager.canGoToPreviousArticle = function() {
    return ArticleManager.currentArticlePosition.index > 0 || ArticleManager.canGoToPreviousDocument();
  };

  /**
   * Is there a previous document to go to?
   *
   * @return {!boolean}
   */
  ArticleManager.canGoToPreviousDocument = function() {
    var i = ArticleManager.currentDocumentIndex - 1;

    for (; i >= 0; i -= 1) {
      if (ArticleManager.index.getDocumentByIndex(i).capabilityFilter()) {
        return true;
      }
    }
    return false;
  };

  /**
   * Go to the beginning of previous document in the flow
   * @param {boolean=} end Go to the end of the document.
   * @param {boolean=} fetch Only return the document, don't move.
   * @return {treesaver.ui.Document} null if there is no next document.
   */
  ArticleManager.previousDocument = function(end, fetch) {
    if (!ArticleManager.canGoToPreviousDocument()) {
      return null;
    }

    var index = ArticleManager.currentDocumentIndex - 1,
        doc = null,
        articlePosition = null;

    for (; index >= 0; index -= 1) {
      doc = /** @type {!treesaver.ui.Document} */ (ArticleManager.index.getDocumentByIndex(index));
      if (doc.capabilityFilter()) {
        break;
      }
    }

    if (doc) {
      if (doc.loaded) {
        articlePosition = new ArticlePosition(doc.getNumberOfArticles() - 1);
      }
      else {
        articlePosition = ArticlePosition.END;
      }

      return fetch ? doc : ArticleManager.setCurrentDocument(doc, articlePosition, end ? treesaver.layout.ContentPosition.END : null, index);
    }
    else {
      return null;
    }
  };

  /**
   * Go to or fetch the previous article or document.
   * @param {boolean=} end Whether to go to the end of the previous article or document.
   * @param {boolean=} fetch Whether to go to the previous article (or document) or fetch it without navigating to it.
   */
  ArticleManager.previousArticle = function(end, fetch) {
    if (!ArticleManager.canGoToPreviousArticle()) {
      return null;
    }

    if (ArticleManager.currentArticlePosition.index > 0) {
      var articlePosition = new ArticlePosition(ArticleManager.currentArticlePosition.index - 1),
          index = ArticleManager.currentDocumentIndex,
          doc = /** @type {!treesaver.ui.Document} */ (ArticleManager.currentDocument);

      return fetch ? doc : ArticleManager.setCurrentDocument(doc, articlePosition, end ? treesaver.layout.ContentPosition.END : null, index);
    }
    else {
      return ArticleManager.previousDocument(end, fetch);
    }
  };

  /**
   * Go to the previous page in the current article. If we are at
   * the first page of the article, go to the last page of the previous
   * article
   * @return {boolean} False if there is no previous page or article.
   */
  ArticleManager.previousPage = function() {
    if (goog.DEBUG) {
      if (!ArticleManager.currentDocument) {
        debug.error('Tried to go to previous article without an article');
        return false;
      }
    }

    // TODO: Try to re-use logic from canGoToPreviousPage
    if (ArticleManager.currentPageIndex === -1) {
      if (!ArticleManager.currentPosition) {
        if (ArticleManager.previousArticle(true)) {
          return true;
        }
      }

      // We have no idea what page we're on, so we can't go back a page
      // TODO: Is there something sane to do here?
      return false;
    }

    var new_index = ArticleManager.currentPageIndex - 1;

    if (new_index < 0) {
      // Go to the previous article, if it exists
      if (ArticleManager.previousArticle(true)) {
        return true;
      }

      // It doesn't exist, so just stay on the first page
      // No change in state, can return now
      return false;
    }

    ArticleManager.currentPageIndex = new_index;

    // Clear the internal position since we're on a new page
    ArticleManager.currentPosition = null;

    // Fire the change event
    events.fireEvent(document, ArticleManager.events.PAGESCHANGED);

    return true;
  };

  /**
   * Can the user go to the next page?
   *
   * @return {boolean}
   */
  ArticleManager.canGoToNextPage = function() {
    // Do we know what page we are on?
    if (ArticleManager.currentPageIndex !== -1) {
      // Do we know there are more pages left?
      if (ArticleManager.currentPageIndex <
          ArticleManager.currentDocument.articles[ArticleManager.currentArticlePosition.index].pageCount - 1) {
        return true;
      }
      else {
        return ArticleManager.currentDocument.articles[ArticleManager.currentArticlePosition.index].paginationComplete && ArticleManager.canGoToNextArticle();
      }
    }
    else {
      // Perhaps we're on the last page of the article?
      if (ArticleManager.currentPosition === treesaver.layout.ContentPosition.END) {
        return ArticleManager.canGoToNextArticle();
      }
      else {
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
  ArticleManager.canGoToNextArticle = function() {
    return (ArticleManager.currentArticlePosition.index < ArticleManager.currentDocument.getNumberOfArticles() - 1) ||
              ArticleManager.canGoToNextDocument();
  };

  /**
   * Is there a next document to go to?
   * @return {boolean}
   */
  ArticleManager.canGoToNextDocument = function() {
    var i = ArticleManager.currentDocumentIndex + 1,
        len = ArticleManager.index.getNumberOfDocuments();

    for (; i < len; i += 1) {
      if (ArticleManager.index.getDocumentByIndex(i).capabilityFilter()) {
        return true;
      }
    }
    return false;
  };

  /**
   * Go to the beginning of next document in the flow
   * @param {boolean=} fetch Only return the document, don't move.
   * @return {treesaver.ui.Document} The next document.
   */
  ArticleManager.nextDocument = function(fetch) {
    if (!ArticleManager.canGoToNextDocument()) {
      return null;
    }

    var index = ArticleManager.currentDocumentIndex + 1,
        doc = null,
        len = ArticleManager.index.getNumberOfDocuments();

    for (; index < len; index += 1) {
      doc = /** @type {!treesaver.ui.Document} */ (ArticleManager.index.getDocumentByIndex(index));
      if (doc.capabilityFilter()) {
        break;
      }
    }

    if (doc) {
      return fetch ? doc : ArticleManager.setCurrentDocument(doc, ArticlePosition.BEGINNING, null, index);
    }
    else {
      return null;
    }
  };

  /**
   * Go to or fetch the next article or document.
   * @param {boolean=} fetch Whether to go to the next article (or document) or fetch it without navigating to it.
   */
  ArticleManager.nextArticle = function(fetch) {
    if (!ArticleManager.canGoToNextArticle()) {
      return null;
    }

    if (ArticleManager.currentArticlePosition.index < ArticleManager.currentDocument.getNumberOfArticles() - 1) {
      var articlePosition = new ArticlePosition(ArticleManager.currentArticlePosition.index + 1),
          index = ArticleManager.currentDocumentIndex,
          doc = /** @type {!treesaver.ui.Document} */ (ArticleManager.currentDocument);

      return fetch ? doc : ArticleManager.setCurrentDocument(doc, articlePosition, null, index);
    }
    else {
      return ArticleManager.nextDocument(fetch);
    }
  };

  /**
   * Go to the next page in the current article. If we are at
   * the last page of the article, go to the first page of the next
   * article
   * @return {boolean} False if there is no previous page or article.
   */
  ArticleManager.nextPage = function() {
    if (goog.DEBUG) {
      if (!ArticleManager.currentDocument) {
        debug.error('Tried to go to next page without an document');
        return false;
      }
    }

    if (ArticleManager.currentPageIndex === -1) {
      if (ArticleManager.currentPosition === treesaver.layout.ContentPosition.END) {
        return ArticleManager.nextArticle();
      }

      // We have no idea what page we're on, so we can't go to the next page
      // TODO: Is there something sane to do here?
      return false;
    }

    var new_index = ArticleManager.currentPageIndex + 1;

    if (new_index >= ArticleManager.currentDocument.articles[ArticleManager.currentArticlePosition.index].pageCount) {
      if (ArticleManager.currentDocument.articles[ArticleManager.currentArticlePosition.index].paginationComplete) {
        // Go to the next article or document, if it exists
        return ArticleManager.nextArticle();
      }

      // We know there will be a next page, but we don't know
      // anything else yet so stay put
      // No change in state, can return now
      return false;
    }

    // Go to our new index
    ArticleManager.currentPageIndex = new_index;

    // Clear the internal position since we're on a new page
    ArticleManager.currentPosition = null;

    // Fire the change event
    events.fireEvent(document, ArticleManager.events.PAGESCHANGED);

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
  ArticleManager.goToDocumentByURL = function(url, pos) {
    var articleAnchor = treesaver.uri.parse(url)['anchor'],
        docs = ArticleManager.index.getDocuments(treesaver.uri.stripHash(url)),
        doc,
        index = -1,
        articlePosition = null;

    if (docs.length !== 0) {
      // Go to the first matching document
      doc = /** @type {!treesaver.ui.Document} */ (docs[0]);

      index = ArticleManager.index.getDocumentIndex(doc);

      // If the document is loaded and we have an anchor, we can just look up the desired article index
      if (doc.loaded && articleAnchor) {
        articlePosition = new ArticlePosition(doc.getArticleIndex(articleAnchor));
      }
      else {
        articlePosition = new ArticlePosition(0, articleAnchor);
      }

      if (index !== -1) {
        return ArticleManager.setCurrentDocument(doc, articlePosition, null, index);
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
  ArticleManager.getPages = function(maxSize, buffer) {
    if (ArticleManager.currentArticlePosition.atEnding() && ArticleManager.currentDocument.loaded) {
      ArticleManager.currentArticlePosition = new ArticlePosition(ArticleManager.currentDocument.articles.length - 1);
    }
    else if (ArticleManager.currentArticlePosition.isAnchor() && ArticleManager.currentDocument.loaded) {
      // This will return 0 (meaning the first article) if the anchor is not found.
      ArticleManager.currentArticlePosition = new ArticlePosition(ArticleManager.currentDocument.getArticleIndex(/** @type {string} */(ArticleManager.currentArticlePosition.anchor)));
    }

    // Set the page size
    if (ArticleManager.currentDocument.articles[ArticleManager.currentArticlePosition.index] &&
        ArticleManager.currentDocument.articles[ArticleManager.currentArticlePosition.index].setMaxPageSize(maxSize)) {
        // Re-layout is required, meaning our pageIndex is worthless
        ArticleManager.currentPageIndex = -1;
        // As is the page width
        ArticleManager.currentPageWidth = 0;
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
    if (ArticleManager.currentDocument.articles[ArticleManager.currentArticlePosition.index] && ArticleManager.currentPageIndex === -1) {
      // Look up by position
      ArticleManager.currentPageIndex = ArticleManager.currentDocument.articles[ArticleManager.currentArticlePosition.index].
        getPageIndex(ArticleManager.currentPosition);

      if (ArticleManager.currentPageIndex === -1) {
        // If we _still_ don't know the page index, well we need to return blanks
        pages.length = pageCount;
        // One loading page will suffice
        pages[buffer] = ArticleManager._createLoadingPage();
        // All done here
        return pages;
      }
    }

    // First page to be requested in current article
    startIndex = ArticleManager.currentPageIndex - buffer;

    if (startIndex < 0) {
      prevDocument = ArticleManager.previousArticle(false, true);

      if (prevDocument && prevDocument.loaded && prevDocument === ArticleManager.currentDocument) {
        prevDocument.articles[ArticleManager.currentArticlePosition.index - 1].setMaxPageSize(maxSize);
        pages = prevDocument.articles[ArticleManager.currentArticlePosition.index - 1].getPages(startIndex, -startIndex);
      }
      else if (prevDocument && prevDocument.loaded && prevDocument.articles[prevDocument.articles.length - 1].paginationComplete) {
        pages = prevDocument.articles[prevDocument.articles.length - 1].getPages(startIndex, -startIndex);
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
    if (ArticleManager.currentDocument.articles[ArticleManager.currentArticlePosition.index]) {
      pages = pages.concat(ArticleManager.currentDocument.articles[ArticleManager.currentArticlePosition.index].
          getPages(startIndex, missingPageCount));
    }

    missingPageCount = pageCount - pages.length;

    // Do we need to get pages from the next document or article?
    if (missingPageCount) {
      nextDocument = ArticleManager.nextArticle(true);

      // The next article could either be in this document (a document with more than one article), or in the next document
      if (nextDocument && nextDocument === ArticleManager.currentDocument) {
        nextDocument.articles[ArticleManager.currentArticlePosition.index + 1].setMaxPageSize(maxSize);
        pages = pages.concat(nextDocument.articles[ArticleManager.currentArticlePosition.index + 1].getPages(0, missingPageCount));
      }
      else if (nextDocument) {
        if (!nextDocument.loaded) {
          nextDocument.load();
          pages.length = pageCount;
        }
        else {
          nextDocument.articles[0].setMaxPageSize(maxSize);
          pages = pages.concat(nextDocument.articles[0].getPages(0, missingPageCount));
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
        if (!ArticleManager.currentDocument.error) {
          pages[i] = ArticleManager._createLoadingPage();
        }
        else {
          pages[i] = ArticleManager._createErrorPage();
        }
      }
    }

    // Set our position if we don't have one
    if (!ArticleManager.currentPosition ||
        ArticleManager.currentPosition === treesaver.layout.ContentPosition.END) {
      // Loading/error pages don't have markers
      if (pages[buffer] && pages[buffer].begin) {
        ArticleManager.currentPosition = pages[buffer].begin;
      }
    }

    if (ArticleManager.currentDocument.articles[ArticleManager.currentArticlePosition.index] && !ArticleManager.currentPageWidth) {
      // Set only if it's a real page
      ArticleManager.currentPageWidth =
        ArticleManager.currentDocument.articles[ArticleManager.currentArticlePosition.index].getPageWidth();
    }

    // Clone any duplicates so we always have unique nodes
    for (i = 0; i < pages.length; i += 1) {
      for (j = i + 1; j < pages.length; j += 1) {
        if (pages[i] && pages[i] === pages[j]) {
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
  ArticleManager.getCurrentUrl = function() {
    return ArticleManager.currentDocument.url;
  };

  /**
   * Returns the current document
   * @return {treesaver.ui.Document}
   */
  ArticleManager.getCurrentDocument = function() {
    return ArticleManager.currentDocument;
  };

  /**
   * Get the page number (1-based) of the current page
   * @return {number}
   */
  ArticleManager.getCurrentPageNumber = function() {
    return (ArticleManager.currentPageIndex + 1) || 1;
  };

  /**
   * Get the number of pages in the current article
   * @return {number}
   */
  ArticleManager.getCurrentPageCount = function() {
    if (!ArticleManager.currentDocument.articles[ArticleManager.currentArticlePosition.index] ||
        ArticleManager.currentArticlePosition === ArticlePosition.END) {
      return 1;
    }
    else {
      return ArticleManager.currentDocument.articles[ArticleManager.currentArticlePosition.index].pageCount || 1;
    }
  };

  /**
   * Return the document number (1-based) of the current document.
   * @return {number}
   */
  ArticleManager.getCurrentDocumentNumber = function() {
    return (ArticleManager.currentDocumentIndex + 1) || 1;
  };

  /**
   * Return the number of documents in the index.
   * @return {number}
   */
  ArticleManager.getDocumentCount = function() {
    return ArticleManager.index.getNumberOfDocuments();
  };

  /**
   * Get the number of pages in the current article
   * @return {number}
   */
  ArticleManager.getCurrentPageWidth = function() {
    return ArticleManager.currentPageWidth;
  };

  /**
   * Get the figure that corresponds to the given element in the current
   * article
   *
   * @param {!Element} el
   * @return {?treesaver.layout.Figure}
   */
  ArticleManager.getFigure = function(el) {
    var figureIndex = parseInt(el.getAttribute('data-figureindex'), 10);

    if (isNaN(figureIndex)) {
      return null;
    }

    // TODO: Refactor this
    return ArticleManager.currentDocument.articles[ArticleManager.currentArticlePosition.index].content.figures[figureIndex];
  };

  /**
   * Redirects the browser to the URL for the given document
   * @private
   * @param {!treesaver.ui.Document} doc
   */
  ArticleManager.redirectToDocument = function(doc) {
    if (network.isOnline()) {
      document.location = doc.url;
    }
    else {
      debug.error('Tried to redirect to a document while offline');
    }
  };

  /**
   * @param {!treesaver.ui.Document} doc The document to set as current. Will be loaded if necessary.
   * @param {!treesaver.ui.ArticlePosition} articlePosition The article position within the document. Can be used to set the last article of a document as current, or jump to a specific article within a document.
   * @param {?treesaver.layout.ContentPosition} pos The position within an article.
   * @param {?number} index The index at which the document should be placed.
   * @param {boolean=} noHistory Whether to modify the history or not.
   */
  ArticleManager.setCurrentDocument = function(doc, articlePosition, pos, index, noHistory) {
    var articleAnchor = null,
        url = null,
        path = null,
        article;

    if (!doc) {
      return false;
    }

    articleAnchor = doc.getArticleAnchor(articlePosition && articlePosition.index || 0) || articlePosition.isAnchor() && articlePosition.anchor;
    url = doc.url + (articleAnchor ? '#' + articleAnchor : '');
    path = doc.path + (articleAnchor ? '#' + articleAnchor : '');

    if (doc.equals(ArticleManager.currentDocument) &&
        index !== ArticleManager.currentDocumentIndex &&
        !ArticleManager.currentArticlePosition.equals(articlePosition)) {
      // Same document, but different article
      article = ArticleManager.currentDocument.getArticle(articlePosition.index);

      // Update the article position & article
      ArticleManager.currentArticle = article;
      ArticleManager.currentArticlePosition = articlePosition;

      ArticleManager._setPosition(pos);
      ArticleManager.currentPageIndex = -1;

      // Update the browser URL, but only if we are supposed to
      if (!noHistory) {
        treesaver.history.pushState({
          index: index,
          url: url,
          position: pos
        }, doc.meta['title'], path);
      }
      else {
        treesaver.history.replaceState({
          index: index,
          url: url,
          position: pos
        }, doc.meta['title'], path);
      }

      // Fire the ARTICLECHANGED event
      events.fireEvent(document, ArticleManager.events.PAGESCHANGED);
      events.fireEvent(document, ArticleManager.events.ARTICLECHANGED, {
        'article': article
      });
      return true;
    }

    document.title = doc.meta['title'] || doc.title;

    ArticleManager.currentDocument = doc;
    ArticleManager._setPosition(pos);
    // Changing document/article always changes the current page index
    ArticleManager.currentPageIndex = -1;
    ArticleManager.currentArticlePosition = articlePosition;
    ArticleManager.currentArticle = ArticleManager.currentDocument.getArticle(articlePosition && articlePosition.index || 0);

    if (!doc.loaded) {
      doc.load();
    }
    else if (doc.error) {
      if (capabilities.IS_NATIVE_APP) {
        // Article did not load correctly, can happen due to long wait on 3G
        // or even being offline
        // for now, ignore
      }
      else {
        ArticleManager.redirectToDocument(doc);
      }
    }

    if (index || index === 0) {
      ArticleManager.currentDocumentIndex = index;
    }
    else {
      ArticleManager.currentDocumentIndex = ArticleManager.index.getDocumentIndex(doc);
    }

    // Update the browser URL, but only if we are supposed to
    if (!noHistory) {
      treesaver.history.pushState({
        index: index,
        url: url,
        position: pos
      }, doc.meta['title'] || '', path);
    }
    else {
      treesaver.history.replaceState({
        index: index,
        url: url,
        position: pos
      }, doc.meta['title'] || '', path);
    }

    // Fire events
    events.fireEvent(document, ArticleManager.events.PAGESCHANGED);
    events.fireEvent(document, ArticleManager.events.DOCUMENTCHANGED, {
      'document': doc,
      'url': url,
      'path': path
    });
    events.fireEvent(document, ArticleManager.events.ARTICLECHANGED, {
      'article': ArticleManager.currentArticle
    });

    return true;
  };

  /**
   * @private
   * @param {treesaver.layout.ContentPosition} position
   */
  ArticleManager._setPosition = function(position) {
    if (ArticleManager.currentPosition === position) {
      // Ignore spurious
      return;
    }

    ArticleManager.currentPosition = position;
    // TODO: Automatically query?
    ArticleManager.currentPageIndex = -1;
  };

  /**
   * Generate a loading page
   * @private
   * @return {treesaver.layout.Page}
   */
  ArticleManager._createLoadingPage = function() {
    // Constuct a mock loading page
    // TODO: Make this size reasonably
    return /** @type {treesaver.layout.Page} */ ({
      activate: treesaver.layout.Page.prototype.activate,
      deactivate: treesaver.layout.Page.prototype.deactivate,
      html: ArticleManager.loadingPageHTML,
      size: ArticleManager.loadingPageSize
    });
  };

  /**
   * Generate an error page
   * @private
   * @return {treesaver.layout.Page}
   */
  ArticleManager._createErrorPage = function() {
    // Constuct a mock loading page
    // TODO: Make this size reasonably
    return /** @type {treesaver.layout.Page} */ ({
      activate: treesaver.layout.Page.prototype.activate,
      deactivate: treesaver.layout.Page.prototype.deactivate,
      html: ArticleManager.errorPageHTML,
      size: ArticleManager.errorPageSize
    });
  };

  // Expose functions
  goog.exportSymbol('treesaver.canGoToNextPage', ArticleManager.canGoToNextPage);
  goog.exportSymbol('treesaver.canGoToPreviousPage', ArticleManager.canGoToPreviousPage);
  goog.exportSymbol('treesaver.canGoToNextDocument', ArticleManager.canGoToNextDocument);
  goog.exportSymbol('treesaver.canGoToPreviousDocument', ArticleManager.canGoToPreviousDocument);
  goog.exportSymbol('treesaver.getCurrentUrl', ArticleManager.getCurrentUrl);
  goog.exportSymbol('treesaver.getCurrentPageNumber', ArticleManager.getCurrentPageNumber);
  goog.exportSymbol('treesaver.getCurrentPageCount', ArticleManager.getCurrentPageCount);
  goog.exportSymbol('treesaver.getCurrentDocumentNumber', ArticleManager.getCurrentDocumentNumber);
  goog.exportSymbol('treesaver.getCurrentDocument', ArticleManager.getCurrentDocument);
  goog.exportSymbol('treesaver.getDocumentCount', ArticleManager.getDocumentCount);
  goog.exportSymbol('treesaver.goToDocumentByURL', ArticleManager.goToDocumentByURL);
});
