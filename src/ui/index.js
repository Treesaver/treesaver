goog.provide('treesaver.ui.Index');

goog.require('treesaver.json');
goog.require('treesaver.uri');
goog.require('treesaver.object');
goog.require('treesaver.network');
goog.require('treesaver.ui.TreeNode');
goog.require('treesaver.ui.Document');


treesaver.ui.Index = function (url) {

  /**
   * @type {!string}
   */
  this.url = url;

  /**
   * @type {!Array.<treesaver.ui.Document>}
   */
  this.children = [];

  /**
   * @type {boolean}
   */
  this.loaded = false;

  /**
   * @type {boolean}
   */
  this.loading = false;

  this.documentMap = {};
  this.documentPositions = {};
  this.documents = [];

  this.articles = [];
};

treesaver.ui.Index.prototype = new treesaver.ui.TreeNode();

// Do we ever use a different cache prefix? If not, perhaps we should
// pull this up.
treesaver.ui.Index.CACHE_STORAGE_PREFIX = 'cache:';

treesaver.ui.Index.events = {
  LOADFAILED: 'treesaver.index.loadfailed',
  LOADED: 'treesaver.index.loaded'
};

/**
 * Parses an index entry and returns a new Document instance.
 * @private
 */
treesaver.ui.Index.prototype.parseEntry = function(entry) {
  var url = entry['url'],
      children = entry['children'],
      meta = {},
      doc = null;
  
  if (!url) {
    treesaver.debug.warn('Ignored document index entry without URL');
    return null;
  }

  // Resolve this URL, and strip the hash if necessary
  url = treesaver.uri.stripHash(treesaver.network.absoluteURL(url));

  // Copy all meta fields into a new object (except url and children)
  Object.keys(entry).forEach(function (key) {
    if (key !== 'url' && key !== 'children') {
      meta[key] = entry[key];
    }
  });

  // Create a new document
  doc = new treesaver.ui.Document(url, [], meta);

  // Depth first traversal of any children, and add them
  if (children && Array.isArray(children)) {
    children.forEach(function (child) {
      doc.appendChild(this.parseEntry(child));
    }, this);
  }

  return doc;
};

treesaver.ui.Index.prototype.invalidate = function () {
  var index = 0;

  this.articles = [];
  this.walk(this.children, function (doc) {
    this.articles = this.articles.concat(doc.articles);
  }, this);
  
  this.documents = [];
  this.documentMap = {};
  this.documentPositions = {};
  index = 0;
  this.walk(this.children, function (doc) {
    if (this.documentMap[doc.url]) {
      this.documentMap[doc.url].push(doc);
    } else {
      this.documentMap[doc.url] = [doc];
    }
    this.documents.push(doc);

    if (this.documentPositions[doc.url]) {
      this.documentPositions[doc.url].push(index);
    } else {
      this.documentPositions[doc.url] = [index];
    }
    index += 1;
  }, this);
};

/**
 * @private
 */
treesaver.ui.Index.prototype.walk = function (entries, fn, scope) {
  return entries.every(function (entry) {
    return fn.call(scope, entry) !== false && this.walk(entry.children, fn);
  }, this);
};

treesaver.ui.Index.prototype.getArticles = function () {
  return this.articles;
};

treesaver.ui.Index.prototype.getDocumentIndex = function (doc) {
  var i = 0,
      result = -1;
  this.walk(this.children, function (d) {
    if (d.equals(doc)) {
      result = i;
      return false;
    }
    i += 1;
  });
  return result;
};

treesaver.ui.Index.prototype.getDocuments = function () {
  var result = [];
  this.walk(this.children, function (doc) {
    result.push(doc);
  });
  return result;
};

treesaver.ui.Index.prototype.get = function (url) {
  var result = [];
  this.walk(this.children, function (doc) {
    if (doc.equals(url)) {
      result.push(doc);
    }
  });
  return result;
};

/**
 * Parses a string or array as the document index.
 */
treesaver.ui.Index.prototype.parse = function (index) {
  var result = [];

  if (!index) {
    return [];
  }

  if (typeof index === 'string') {
    try {
      index = treesaver.json.parse(index);
    } catch (e) {
      treesaver.debug.warn('Tried to parse TOC index file, but failed: ' + e);
      return [];
    }
  }

  if (!Array.isArray(index)) {
    treesaver.debug.warn('Document index should be an array of objects.');
    return [];
  }  
  
  return index.map(function (entry) {
    return this.appendChild(this.parseEntry(entry));
  }, this);
};

// TODO: Maybe generalize caching. There seems to be a pattern here.
treesaver.ui.Index.prototype.load = function () {
  var that = this,
      cached_text = null;

  // Only load once
  if (this.loading) {
    return;
  }

  // Don't try loading if we do not have a proper URL
  if (!this.url) {
    treesaver.events.fireEvent(document, treesaver.ui.Index.events.LOADFAILED, {
          index: this
    });
    return;
  }

  this.loading = true;

  if (!WITHIN_IOS_WRAPPER) {
    cached_text = /** @type {?string} */ (treesaver.storage.get(treesaver.ui.Index.CACHE_STORAGE_PREFIX + this.url));

    if (cached_text) {
      treesaver.debug.log('Index.load: Processing cached content for index: ' + this.url);
      this.children = this.parse(cached_text);
      this.loaded = true;
      this.invalidate();

      treesaver.events.fireEvent(document, treesaver.ui.Index.events.LOADED, {
        index: this
      });
    }
  }

  treesaver.debug.info('Index.load: Downloading index: ' + this.url);

  treesaver.network.get(this.url, function (text) {
    that.loading = false;

    if (!text) {
      if (WITHIN_IOS_WRAPPER || !cached_text) {
        treesaver.debug.info('Index.load: Load failed, no index found at: ' + that.url);
        that.loadFailed = true;
        that.loaded = false;

        treesaver.events.fireEvent(document, treesaver.ui.Index.events.LOADFAILED, {
          index: that
        });
        return;
      } else {
        // Stick with cached content
        treesaver.debug.log('Index.load: Using cached content for index: ' + that.url);
      }
    } else if (WITHIN_IOS_WRAPPER || cached_text !== text) {
      if (!WITHIN_IOS_WRAPPER) {
        treesaver.debug.log('Index.load: Fetched content newer than cache for index: ' + that.url);

        // Save the HTML in the cache
        treesaver.storage.set(treesaver.ui.Index.CACHE_STORAGE_PREFIX + that.url, text, true);
      }

      treesaver.debug.log('Index.load: Processing content for index: ' + that.url);
      that.children = that.parse(text);
      that.loaded = true;
      that.invalidate();

      treesaver.events.fireEvent(document, treesaver.ui.Index.events.LOADED, {
        index: that
      });
    } else {
      treesaver.debug.log('Index.load: Fetched index same as cached');
    }
  });
};
