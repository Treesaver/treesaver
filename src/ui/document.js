goog.provide('treesaver.ui.Document');

goog.require('treesaver.events');
goog.require('treesaver.ui.Article');
goog.require('treesaver.ui.TreeNode');
goog.require('treesaver.uri');

/**
 * Class representing "documents" which are usually HTML pages that contain one or
 * more (top level) articles.
 * @constructor
 * @extends {treesaver.ui.TreeNode}
 * @param {!string} url The url of this document.
 * @param {?Object=} meta Meta-data for this document such as title, author, etc.
 */
treesaver.ui.Document = function (url, meta) {
  if (!url) {
    treesaver.debug.error('Document must have an URL');
    return;
  }

  /**
   * @type {!string}
   */
  this.url = url;

  /**
   * @type {!string}
   */
  this.path = treesaver.uri.parse(url)['relative'];

  /**
   * @type {!Object}
   */
  this.meta = meta || {};

  /**
   * @type {Array.<treesaver.ui.Article>}
   */
  this.articles = [];

  /**
   * Maps identifiers to articles
   * @type {!Object}
   */
  this.articleMap = {};

  /**
   * Maps article positions to anchors
   * @type {Array.<!string>}
   */
  this.anchorMap = [];

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
   * @type {!Array.<treesaver.ui.Document>}
   */
  this.children = [];

  /**
   * @type {?string}
   */
  this.title = null;
};

treesaver.ui.Document.CACHE_STORAGE_PREFIX = 'cache:';

treesaver.ui.Document.events = {
  LOADFAILED: 'treesaver.loadfailed',
  LOADED: 'treesaver.loaded'
};

treesaver.ui.Document.titleRegExp = /<title>\s*(.+?)\s*<\/title>/i;

treesaver.ui.Document.prototype = new treesaver.ui.TreeNode();

/**
 * Parse the content of a document, creating articles where necessary.
 *
 * @param {!string} text The HTML text of a document.
 * @return {Array.<!treesaver.ui.Article>} A list of Article instances that were extracted from the text.
 */
treesaver.ui.Document.prototype.parse = function (text) {
  var node = document.createElement('div'),
      articles = [];

  if (!text || typeof text !== 'string' || text.trim() === '') {
    return [];
  }

  node.innerHTML = text;

  // We have the body of the document at 'requestUrl` in a node now,
  // and we try and find all top level articles.
  articles = treesaver.dom.getElementsByTagName('article', node).filter(function (article) {
    return treesaver.dom.getAncestor(article, 'article') === null;
  });

  // Next we try to find a unique URL for each article
  return articles.map(function (articleNode, index) {
    // If the article has an identifier use it. Otherwise we automatically
    // generate an identifier based on the article's position in the document:
    // `_<position>`, but not for the first article (which can always be
    // referenced by the requestUrl.)
    var identifier = articleNode.getAttribute('id') || (index === 0 ? null : ('_' + index)),
        // FIXME: get rid of the global reference to ArticleManager
        article = new treesaver.ui.Article(treesaver.ui.ArticleManager.grids_, articleNode, this);

    if (identifier) {
      this.articleMap[identifier] = index;
      this.anchorMap[index] = identifier;
    }

    return article;
  }, this);
};

/**
 * Tests for document equality. This usually comes down to comparing their URLs. There is a
 * special exception for when the document is a directory index file.
 *
 * @param {treesaver.ui.Document|string} o A document to compare against, or a url.
 * @return {boolean} True if this document equals `o`.
 */
treesaver.ui.Document.prototype.equals = function (o) {
  var url = o;

  if (!url) {
    return false;
  }

  if (typeof o !== 'string' && o.url) {
    url = o.url;
  }

  if (treesaver.uri.isIndex(url) && treesaver.uri.isIndex(this.url)) {
    return url === this.url;
  } else if (treesaver.uri.isIndex(url)) {
    return treesaver.uri.stripFile(url) === this.url;
  } else if (treesaver.uri.isIndex(this.url)) {
    return url === treesaver.uri.stripFile(this.url);
  } else {
    return url === this.url;
  }
};

/**
 * Returns the article at the given index.
 * @param {!number} index
 * @return {?treesaver.ui.Article}
 */
treesaver.ui.Document.prototype.getArticle = function (index) {
  return this.articles[index] || null;
};

/**
 * Manually set the articles for this Document.
 * @param {Array.<treesaver.ui.Article>} articles
 */
treesaver.ui.Document.prototype.setArticles = function (articles) {
  this.articles = articles;
};

/**
 * Returns the number of articles in this Document. Does not include any child documents.
 * @return {!number}
 */
treesaver.ui.Document.prototype.getNumberOfArticles = function () {
  return this.articles.length;
};

/**
 * Returns the anchor at the given article index.
 * @param {!number} index
 * @return {?string} The anchor or null if the article does not exist or does not have an anchor.
 */
treesaver.ui.Document.prototype.getArticleAnchor = function (index) {
  return this.anchorMap[index] || null;
};

/**
 * Returns the article index for the given anchor.
 * @param {!string} anchor
 * @return {!number} The index for the given anchor, or zero (the first article, which is a sensible fallback when the anchor is not found.)
 */
treesaver.ui.Document.prototype.getArticleIndex = function (anchor) {
  return this.articleMap[anchor] || 0;
};

/**
 * Extract the document title from a string of HTML text.
 * @private
 * @param {!string} text
 * @return {?string}
 */
treesaver.ui.Document.prototype.extractTitle = function (text) {
  var res = treesaver.ui.Document.titleRegExp.exec(text);

  if (res && res[1]) {
    return res[1];
  }
  return null;
};

/**
 * Load this document by an XHR, if it hasn't already been loaded.
 */
treesaver.ui.Document.prototype.load = function () {
  var that = this,
      cached_text = null;

  // Don't load twice
  if (this.loading) {  
    return;
  }

  this.loading = true;

  if (!WITHIN_IOS_WRAPPER) {
    cached_text = /** @type {?string} */ (treesaver.storage.get(treesaver.ui.Document.CACHE_STORAGE_PREFIX + this.url));

    if (cached_text) {
      treesaver.debug.log('Document.load: Processing cached HTML content for document: ' + this.url);
      this.articles = this.parse(cached_text);
      this.title = this.extractTitle(cached_text);
      this.loaded = true;

      treesaver.events.fireEvent(document, treesaver.ui.Document.events.LOADED, {
        'document': this
      });
    }
  }

  treesaver.debug.info('Document.load: Downloading document: ' + this.url);

  treesaver.network.get(this.url, function (text) {
    that.loading = false;

    if (!text) {
      if (WITHIN_IOS_WRAPPER || !cached_text) {
        treesaver.debug.info('Document.load: Load failed, no content: ' + that.url);
        that.loadFailed = true;
        that.loaded = false;

        treesaver.events.fireEvent(document, treesaver.ui.Document.events.LOADFAILED, {
          'document': that
        });
        return;
      } else {
        // Stick with cached content
        treesaver.debug.log('Document.load: Using cached content for document: ' + that.url);
      }
    } else if (WITHIN_IOS_WRAPPER || cached_text !== text) {
      if (!WITHIN_IOS_WRAPPER) {
        treesaver.debug.log('Document.load: Fetched content newer than cache for document: ' + that.url);

        // Save the HTML in the cache
        treesaver.storage.set(treesaver.ui.Document.CACHE_STORAGE_PREFIX + that.url, text, true);
      }

      treesaver.debug.log('Document.load: Processing HTML content for document: ' + that.url);
      that.articles = that.parse(text);
      that.title = that.extractTitle(text);
      that.loaded = true;

      treesaver.events.fireEvent(document, treesaver.ui.Document.events.LOADED, {
        'document': that
      });
    } else {
      treesaver.debug.log('Document.load: Fetched document content same as cached');
    }
  });
};

goog.exportSymbol('treesaver.Document', treesaver.ui.Document);
goog.exportSymbol('treesaver.Document.prototype.setArticles', treesaver.ui.Document.prototype.setArticles);
goog.exportSymbol('treesaver.Document.prototype.parse', treesaver.ui.Document.prototype.parse);
