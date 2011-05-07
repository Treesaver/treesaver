goog.provide('treesaver.ui.Document');

goog.require('treesaver.events');
goog.require('treesaver.ui.Article');
goog.require('treesaver.ui.TreeNode');
goog.require('treesaver.uri');

// TODO: Remove children parameter? Not necessary now that we have appendChild, etc.
treesaver.ui.Document = function (url, children, meta) {
  if (!url) {
    treesaver.debug.error('Document must have an URL');
    return;
  }

  this.url = url;

  this.path = treesaver.uri.parse(url)['relative'];

  this.meta = meta || {};

  /**
   * @type {Array.<treesaver.ui.Article>}
   */
  this.articles = [];

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
  this.children = children || [];
};

treesaver.ui.Document.CACHE_STORAGE_PREFIX = 'cache:';

treesaver.ui.Document.events = {
  LOADFAILED: 'treesaver.loadfailed',
  LOADED: 'treesaver.loaded'
};

treesaver.ui.Document.prototype = new treesaver.ui.TreeNode();

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
        articleUrl = identifier === null ? this.url : (this.url + '#' + identifier);

    // TODO: get rid of the global reference to ArticleManager
    return new treesaver.ui.Article(articleUrl, treesaver.ui.ArticleManager.grids_, articleNode);
  }, this);
};

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
      this.loaded = true;

      treesaver.events.fireEvent(document, treesaver.ui.Document.events.LOADED, {
        document: this
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
          document: that
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
      that.loaded = true;

      treesaver.events.fireEvent(document, treesaver.ui.Document.events.LOADED, {
        document: that
      });
    } else {
      treesaver.debug.log('Document.load: Fetched document content same as cached');
    }
  });
};
