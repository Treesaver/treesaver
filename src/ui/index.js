goog.provide('treesaver.ui.Index');

goog.require('treesaver.capabilities');
goog.require('treesaver.debug');
goog.require('treesaver.events');
goog.require('treesaver.json');
goog.require('treesaver.network');
goog.require('treesaver.object');
goog.require('treesaver.storage');
goog.require('treesaver.ui.Document');
goog.require('treesaver.ui.TreeNode');
goog.require('treesaver.uri');

/**
 * Class representing the index file (i.e. the table of contents for documents.)
 * @constructor
 * @extends {treesaver.ui.TreeNode}
 * @param {?string} url The url the index was loaded from.
 */
treesaver.ui.Index = function(url) {
  this.url = url;
  this.settings = {};
  this.meta = {};
};

goog.scope(function() {
  var Index = treesaver.ui.Index,
      Document = treesaver.ui.Document,
      TreeNode = treesaver.ui.TreeNode,
      capabilities = treesaver.capabilities,
      debug = treesaver.debug,
      uri = treesaver.uri,
      events = treesaver.events,
      network = treesaver.network,
      storage = treesaver.storage,
      json = treesaver.json;

  Index.prototype = new TreeNode();

  /**
   * @type {?string}
   */
  Index.prototype.url;

  /**
   * @type {!Array.<treesaver.ui.Document>}
   */
  Index.prototype.contents;

  /**
   * @type {!Object}
   */
  Index.prototype.settings;

  /**
   * @type {!Object}
   */
  Index.prototype.meta;

  /**
   * @type {boolean}
   */
  Index.prototype.loaded;

  /**
   * @type {boolean}
   */
  Index.prototype.loading;

  /**
   * @type {!Object}
   */
  Index.prototype.documentMap;

  /**
   * @type {!Object}
   */
  Index.prototype.documentPositions;

  /**
   * Linear list of documents. This is used as a cache. You can invalidate and repopulate the cache by calling update().
   * @type {!Array.<treesaver.ui.Document>}
   */
  Index.prototype.documents = [];

  // Do we ever use a different cache prefix? If not, perhaps we should
  // pull this up.
  Index.CACHE_STORAGE_PREFIX = 'cache:';

  Index.events = {
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
  Index.prototype.parseEntry = function(entry) {
    var url = null,
        contents = null,
        meta = {},
        requirements = null,
        doc = null;

    if (typeof entry === 'string') {
      url = entry;
    }
    else {
      url = entry['url'];
      contents = entry['contents'];

      // Copy all fields into a new object
      Object.keys(entry).forEach(function(key) {
        meta[key] = entry[key];
      });

      if (entry['requires']) {
        if (typeof entry['requires'] === 'string') {
          requirements = entry['requires'].split(/\s|,\s/g);
        }
        else if (Array.isArray(entry['requires'])) {
          // Make sure our `requires` entries are actually strings
          requirements = entry['requires'].map(function(value) {
            return value.toString();
          });
        }

        requirements = requirements.filter(function(value) {
          return value.trim() !== '';
        });
      }
    }

    if (!url) {
      debug.warn('Ignored document index entry without URL');
      return null;
    }

    // Resolve this URL, and strip the hash if necessary
    url = uri.stripHash(network.absoluteURL(url));

    // Create a new document
    doc = new Document(url, meta);

    // Depth first traversal of any contents, and add them
    if (contents && Array.isArray(contents)) {
      contents.forEach(function(child) {
        doc.appendChild(this.parseEntry(child));
      }, this);
    }

    if (requirements) {
      doc.requirements = requirements;
    }

    return doc;
  };

  /**
   * Updates the document cache and repopulates it. This
   * should be called after manually modifying the index.
   */
  Index.prototype.update = function() {
    var index = 0;

    this.documents = [];
    this.documentMap = {};
    this.documentPositions = {};

    this.walk(this.contents, function(doc) {
      if (this.documentMap[doc.url]) {
        this.documentMap[doc.url].push(doc);
      }
      else {
        this.documentMap[doc.url] = [doc];
      }
      this.documents.push(doc);

      if (this.documentPositions[doc.url]) {
        this.documentPositions[doc.url].push(index);
      }
      else {
        this.documentPositions[doc.url] = [index];
      }
      index += 1;
    }, this);

    events.fireEvent(document, Index.events.UPDATED, {
      'index': this
    });
  };

  /**
   * Depth first walk through the index.
   *
   * @private
   * @param {Array.<treesaver.ui.TreeNode>} contents
   * @param {!function(!treesaver.ui.TreeNode)} fn Callback to call for each node. Return false to exit the traversal early.
   * @param {Object=} scope Scope bound to the callback.
   */
  Index.prototype.walk = function(contents, fn, scope) {
    return contents.every(function(entry) {
      return fn.call(scope, entry) !== false && this.walk(entry.contents, fn, scope);
    }, this);
  };

  /**
   * Return the document at `index`.
   * @param {!number} index
   * @return {?treesaver.ui.Document}
   */
  Index.prototype.getDocumentByIndex = function(index) {
    return this.documents[index];
  };

  /**
   * Returns the total number of documents in this index.
   * @return {!number}
   */
  Index.prototype.getNumberOfDocuments = function() {
    return this.documents.length;
  };

  /**
   * Returns the document index of the given document (the position in a depth first traversal of the document hierarchy.)
   * @param {!treesaver.ui.Document} doc
   * @return {!number}
   */
  Index.prototype.getDocumentIndex = function(doc) {
    var result = -1,
        i = 0;

    this.walk(this.contents, function(d) {
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
  Index.prototype.getDocuments = function(url) {
    var result = [];

    if (!url) {
      return this.documents;
    }
    else {
      this.walk(this.contents, function(doc) {
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
  Index.prototype.parse = function(index) {
    var result = {
          contents: [],
          settings: {},
          meta: {}
        };

    if (!index) {
      return result;
    }

    if (typeof index === 'string') {
      try {
        index = /** @type {!Array} */ (json.parse(index));
      } catch (e) {
        debug.warn('Tried to parse index file, but failed: ' + e);
        return result;
      }
    }

    if (!treesaver.object.isObject(/** @type {!Object} */ (index))) {
      debug.warn('Document index should be an object.');
      return result;
    }

    if (!index['contents'] || !Array.isArray(index['contents'])) {
      debug.warn('Document index does not contain a valid "contents" array.');
      return result;
    }

    result.contents = index['contents'].map(function(entry) {
      return this.parseEntry(entry);
    }, this);

    result.contents = result.contents.filter(function(entry) {
      return entry !== null;
    });

    result.contents = result.contents.map(function(entry) {
      return this.appendChild(entry);
    }, this);

    if (index['settings']) {
      result.settings = {};
      Object.keys(index['settings']).forEach(function(key) {
        result.settings[key] = index['settings'][key];
      });
    }

    Object.keys(index).forEach(function(key) {
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
  Index.prototype.set = function(key, value) {
    return this.settings[key] = value;
  };

  /**
   * Retrieve a publication wide configuration property.
   *
   * @param {!string} key
   * @param {*=} defaultValue
   * @return {?*}
   */
  Index.prototype.get = function(key, defaultValue) {
    if (this.settings.hasOwnProperty(key)) {
      return this.settings[key];
    }
    else {
      return defaultValue;
    }
  };

  /**
   * Returns the meta-data for this publication.
   *
   * @return {!Object}
   */
  Index.prototype.getMeta = function() {
    return this.meta;
  };

  /**
   * Load the index file through XHR if it hasn't already been loaded.
   */
  Index.prototype.load = function() {
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
      events.fireEvent(document, Index.events.LOADFAILED, {
        'index': this
      });
      return;
    }

    this.loading = true;

    if (!capabilities.IS_NATIVE_APP) {
      cached_text = /** @type {?string} */ (storage.get(Index.CACHE_STORAGE_PREFIX + this.url));

      if (cached_text) {
        debug.log('Index.load: Processing cached content for index: ' + this.url);
        index = this.parse(cached_text);

        this.contents = index.contents;
        this.meta = index.meta;
        this.settings = index.settings;
        this.loaded = true;

        events.fireEvent(document, Index.events.LOADED, {
          'index': this
        });

        this.update();
      }
    }

    debug.info('Index.load: Downloading index: ' + this.url);

    network.get(this.url, function(text) {
      that.loading = false;

      if (!text) {
        if (treesaver.capabilities.IS_NATIVE_APP || !cached_text) {
          debug.info('Index.load: Load failed, no index found at: ' + that.url);
          that.loadFailed = true;
          that.loaded = false;

          events.fireEvent(document, Index.events.LOADFAILED, {
            'index': that
          });
          return;
        }
        else {
          // Stick with cached content
          debug.log('Index.load: Using cached content for index: ' + that.url);
        }
      }
      else if (capabilities.IS_NATIVE_APP || cached_text !== text) {
        if (!capabilities.IS_NATIVE_APP) {
          debug.log('Index.load: Fetched content newer than cache for index: ' + that.url);

          // Save the HTML in the cache
          storage.set(Index.CACHE_STORAGE_PREFIX + that.url, text, true);
        }

        debug.log('Index.load: Processing content for index: ' + that.url);
        index = that.parse(text);
        that.contents = index.contents;
        that.meta = index.meta;
        that.settings = index.settings;
        that.loaded = true;

        events.fireEvent(document, Index.events.LOADED, {
          'index': that
        });

        that.update();
      }
      else {
        debug.log('Index.load: Fetched index same as cached');
      }
    });
  };

  goog.exportSymbol('treesaver.Index', Index);
  goog.exportSymbol('treesaver.Index.prototype.get', Index.prototype.get);
  goog.exportSymbol('treesaver.Index.prototype.set', Index.prototype.set);
  goog.exportSymbol('treesaver.Index.prototype.update', Index.prototype.update);
  goog.exportSymbol('treesaver.Index.prototype.getDocuments', Index.prototype.getDocuments);
  goog.exportSymbol('treesaver.Index.prototype.getNumberOfDocuments', Index.prototype.getNumberOfDocuments);
  goog.exportSymbol('treesaver.Index.prototype.getMeta', Index.prototype.getMeta);
});
