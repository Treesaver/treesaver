goog.provide('treesaver.ui.Index');

goog.require('treesaver.json');
goog.require('treesaver.uri');
goog.require('treesaver.object');
goog.require('treesaver.network');
goog.require('treesaver.storage');
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
   * @type {!Object}
   */
  this.settings = {};

  /**
   * @type {!Object}
   */
  this.meta = {};

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
   * Linear list of documents. This is used as a cache. You can invalidate and repopulate the cache by calling update().
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
  var url = null,
      children = null,
      meta = {},
      doc = null;

  if (typeof entry === 'string') {
    url = entry;
  } else {
    url = entry['url'];
    children = entry['children'];

    // Copy all fields into a new object
    Object.keys(entry).forEach(function (key) {
      meta[key] = entry[key];
    });
  }
  
  if (!url) {
    treesaver.debug.warn('Ignored document index entry without URL');
    return null;
  }

  // Resolve this URL, and strip the hash if necessary
  url = treesaver.uri.stripHash(treesaver.network.absoluteURL(url));

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
 * Updates the document cache and repopulates it. This
 * should be called after manually modifying the index.
 */
treesaver.ui.Index.prototype.update = function () {
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
    'index': this
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
  var result = -1,
      i = 0;

  this.walk(this.children, function (d) {
    if (d.equals(doc)) {
      result = i;
    }
    i += 1;
  }, this);

  return result;
};

/**
 * Returns all documents matching the given URL in the live index, or the linear
 * ordering of documents as extracted from a depth first traversal of the document
 * hierarchy when no URL is given.
 *
 * @param {?string} url
 * @return {Array.<treesaver.ui.Document>}
 */
treesaver.ui.Index.prototype.getDocuments = function (url) {
  var result = [];

  if (!url) {
    return this.documents;
  } else {
    this.walk(this.children, function (doc) {
      if (doc.equals(url)) {
        result.push(doc);
      }
    }, this);
    return result;
  }
};

/**
 * Parses a string or array as the document index.
 * @private
 * @param {!string|!Object} index
 */
treesaver.ui.Index.prototype.parse = function (index) {
  var result = {
        children: [],
        settings: {},
        meta: {}
      };

  if (!index) {
    return result;
  }

  if (typeof index === 'string') {
    try {
      index = /** @type {!Array} */ (treesaver.json.parse(index));
    } catch (e) {
      treesaver.debug.warn('Tried to parse index file, but failed: ' + e);
      return result;
    }
  }

  if (!treesaver.object.isObject(/** @type {!Object} */ (index))) {
    treesaver.debug.warn('Document index should be an object.');
    return result;
  }

  if (!index['children'] || !Array.isArray(index['children'])) {
    treesaver.debug.warn('Document index does not contain a valid "children" array.');
    return result;
  }

  result.children = index['children'].map(function (entry) {
    return this.parseEntry(entry);
  }, this);

  result.children = result.children.filter(function (entry) {
    return entry !== null;
  });

  result.children = result.children.map(function (entry) {
    return this.appendChild(entry);
  }, this);

  if (index['settings']) {
    result.settings = {};
    Object.keys(index.settings).forEach(function (key) {
      result.settings[key] = index.settings[key];
    });
  }

  Object.keys(index).forEach(function (key) {
    if (key !== 'settings') {
      result.meta[key] = index[key];
    }
  });

  return result;
};

/**
 * Set a publication wide configuration property.
 *
 * @param {!string} key
 * @param {!*} value
 */
treesaver.ui.Index.prototype.set = function (key, value) {
  return this.settings[key] = value;
};

/**
 * Retrieve a publication wide configuration property.
 *
 * @param {!string} key
 * @param {*=} defaultValue
 * @return {?*}
 */
treesaver.ui.Index.prototype.get = function (key, defaultValue) {
  if (this.settings.hasOwnProperty(key)) {
    return this.settings[key];
  } else {
    return defaultValue;
  }
};

/**
 * Returns the meta-data for this publication.
 *
 * @return {!Object}
 */
treesaver.ui.Index.prototype.getMeta = function () {
  return this.meta;
};

/**
 * Load the index file through XHR if it hasn't already been loaded.
 */
treesaver.ui.Index.prototype.load = function () {
  var that = this,
      cached_text = null,
      index = null;

  // TODO: Maybe generalize caching. There seems to be a pattern here.

  // Only load once
  if (this.loading) {
    return;
  }

  // Don't try loading if we do not have a proper URL
  if (!this.url) {
    treesaver.events.fireEvent(document, treesaver.ui.Index.events.LOADFAILED, {
      'index': this
    });
    return;
  }

  this.loading = true;

  if (!treesaver.capabilities.IS_NATIVE_APP) {
    cached_text = /** @type {?string} */ (treesaver.storage.get(treesaver.ui.Index.CACHE_STORAGE_PREFIX + this.url));

    if (cached_text) {
      treesaver.debug.log('Index.load: Processing cached content for index: ' + this.url);
      index = this.parse(cached_text);

      this.children = index.children;
      this.meta = index.meta;
      this.settings = index.settings;
      this.loaded = true;

      treesaver.events.fireEvent(document, treesaver.ui.Index.events.LOADED, {
        'index': this
      });

      this.update();
    }
  }

  treesaver.debug.info('Index.load: Downloading index: ' + this.url);

  treesaver.network.get(this.url, function (text) {
    that.loading = false;

    if (!text) {
      if (treesaver.capabilities.IS_NATIVE_APP || !cached_text) {
        treesaver.debug.info('Index.load: Load failed, no index found at: ' + that.url);
        that.loadFailed = true;
        that.loaded = false;

        treesaver.events.fireEvent(document, treesaver.ui.Index.events.LOADFAILED, {
          'index': that
        });
        return;
      } else {
        // Stick with cached content
        treesaver.debug.log('Index.load: Using cached content for index: ' + that.url);
      }
    } else if (treesaver.capabilities.IS_NATIVE_APP || cached_text !== text) {
      if (!treesaver.capabilities.IS_NATIVE_APP) {
        treesaver.debug.log('Index.load: Fetched content newer than cache for index: ' + that.url);

        // Save the HTML in the cache
        treesaver.storage.set(treesaver.ui.Index.CACHE_STORAGE_PREFIX + that.url, text, true);
      }

      treesaver.debug.log('Index.load: Processing content for index: ' + that.url);
      index = that.parse(text);
      that.children = index.children;
      that.meta = index.meta;
      that.settings = index.settings;
      that.loaded = true;

      treesaver.events.fireEvent(document, treesaver.ui.Index.events.LOADED, {
        'index': that
      });

      that.update();
    } else {
      treesaver.debug.log('Index.load: Fetched index same as cached');
    }
  });
};

goog.exportSymbol('treesaver.Index', treesaver.ui.Index, window);
goog.exportSymbol('treesaver.Index.prototype.get', treesaver.ui.Index.prototype.get, window);
goog.exportSymbol('treesaver.Index.prototype.set', treesaver.ui.Index.prototype.set, window);
goog.exportSymbol('treesaver.Index.prototype.update', treesaver.ui.Index.prototype.update, window);
goog.exportSymbol('treesaver.Index.prototype.getDocuments', treesaver.ui.Index.prototype.getDocuments, window);
goog.exportSymbol('treesaver.Index.prototype.getNumberOfDocuments', treesaver.ui.Index.prototype.getNumberOfDocuments, window);
goog.exportSymbol('treesaver.Index.prototype.getMeta', treesaver.ui.Index.prototype.getMeta, window);
