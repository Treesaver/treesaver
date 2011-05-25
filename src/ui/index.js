goog.provide('treesaver.ui.Index');

goog.require('treesaver.json');
goog.require('treesaver.uri');
goog.require('treesaver.object');
goog.require('treesaver.network');
goog.require('treesaver.ui.TreeNode');
goog.require('treesaver.ui.Document');

/**
 * Class representing the index file (i.e. the table of contents for documents.)
 * @constructor
 * @extends {treesaver.ui.TreeNode}
 * @param {?string} url The url the index was loaded from.
 */
treesaver.ui.Index = function (url) {

  /**
   * @type {?string}
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

  /**
   * @type {!Object}
   */
  this.documentMap = {};

  /**
   * @type {!Object}
   */
  this.documentPositions = {};

  /**
   * Linear list of documents. This is used as a cache. You can invalidate and repopulate the cache by calling invalidate().
   * @type {!Array.<treesaver.ui.Document>}
   */
  this.documents = [];
};

treesaver.ui.Index.prototype = new treesaver.ui.TreeNode();

// Do we ever use a different cache prefix? If not, perhaps we should
// pull this up.
treesaver.ui.Index.CACHE_STORAGE_PREFIX = 'cache:';

treesaver.ui.Index.events = {
  LOADFAILED: 'treesaver.index.loadfailed',
  LOADED: 'treesaver.index.loaded',
  UPDATED: 'treesaver.index.updated'
};

/**
 * Parses an index entry and returns a new Document instance.
 * @private
 * @param {!Object} entry
 * @return {?treesaver.ui.Document}
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

  // Copy all meta fields into a new object
  Object.keys(entry).forEach(function (key) {
    meta[key] = entry[key];
  });

  // Create a new document
  doc = new treesaver.ui.Document(url, meta);

  // Depth first traversal of any children, and add them
  if (children && Array.isArray(children)) {
    children.forEach(function (child) {
      doc.appendChild(this.parseEntry(child));
    }, this);
  }

  return doc;
};

/**
 * Invalidate the document cache and repopulates it. This
 * should be called after manually modifying the index.
 */
treesaver.ui.Index.prototype.invalidate = function () {
  var index = 0;
  
  this.documents = [];
  this.documentMap = {};
  this.documentPositions = {};

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

  treesaver.events.fireEvent(document, treesaver.ui.Index.events.UPDATED, {
    index: this
  });
};

/**
 * Depth first walk through the index.
 *
 * @private
 * @param {Array.<treesaver.ui.TreeNode>} children
 * @param {!function(!treesaver.ui.TreeNode)} fn Callback to call for each node. Return false to exit the traversal early.
 * @param {Object=} scope Scope bound to the callback.
 */
treesaver.ui.Index.prototype.walk = function (children, fn, scope) {
  return children.every(function (entry) {
    return fn.call(scope, entry) !== false && this.walk(entry.children, fn, scope);
  }, this);
};

/**
 * Return the document at `index`.
 * @param {!number} index
 * @return {?treesaver.ui.Document}
 */
treesaver.ui.Index.prototype.getDocumentByIndex = function (index) {
  return this.documents[index];
};

/**
 * Returns the total number of documents in this index.
 * @return {!number}
 */
treesaver.ui.Index.prototype.getNumberOfDocuments = function () {
  return this.documents.length;
};

/**
 * Returns the document index of the given document (the position in a depth first traversal of the document hierarchy.)
 * @param {!treesaver.ui.Document} doc
 * @return {!number}
 */
treesaver.ui.Index.prototype.getDocumentIndex = function (doc) {
  var result = -1;

  this.documents.every(function (d, i) {
    if (d.equals(doc)) {
      result = i;
      return false;
    }
    return true;
  });

  return result;
};

/**
 * Returns the linear ordering of documents as extracted from a depth first traversal of the document hierarchy.
 * @return {!Array.<treesaver.ui.Document>}
 */
treesaver.ui.Index.prototype.getDocuments = function () {
  return this.documents;
};

/**
 * Returns all documents matching the given URL in the live index.
 * @param {!string} url
 * @return {Array.<treesaver.ui.Document>}
 */
treesaver.ui.Index.prototype.get = function (url) {
  var result = [];

  this.walk(this.children, function (doc) {
    if (doc.equals(url)) {
      result.push(doc);
    }
  }, this);
  return result;
};

/**
 * Parses a string or array as the document index.
 * @private
 * @param {!string|!Array} index
 */
treesaver.ui.Index.prototype.parse = function (index) {
  var result = [];

  if (!index) {
    return [];
  }

  if (typeof index === 'string') {
    try {
      index = /** @type {!Array} */ (treesaver.json.parse(index));
    } catch (e) {
      treesaver.debug.warn('Tried to parse TOC index file, but failed: ' + e);
      return [];
    }
  }

  if (!Array.isArray(/** @type {!Object} */ (index))) {
    treesaver.debug.warn('Document index should be an array of objects.');
    return [];
  }

  return index.map(function (entry) {
    return this.appendChild(this.parseEntry(entry));
  }, this);
};

/**
 * Load the index file through XHR if it hasn't already been loaded.
 */
treesaver.ui.Index.prototype.load = function () {
  var that = this,
      cached_text = null;

  // TODO: Maybe generalize caching. There seems to be a pattern here.

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

      treesaver.events.fireEvent(document, treesaver.ui.Index.events.LOADED, {
        index: this
      });

      this.invalidate();
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

      treesaver.events.fireEvent(document, treesaver.ui.Index.events.LOADED, {
        index: that
      });

      that.invalidate();
    } else {
      treesaver.debug.log('Index.load: Fetched index same as cached');
    }
  });
};
