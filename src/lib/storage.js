/**
 * @fileoverview Simple online/offline storage system
 */

goog.provide('treesaver.storage');

goog.require('treesaver.array'); // forEach
goog.require('treesaver.debug');

/**
 * @param {!string} key
 * @param {!*} value
 * @param {boolean=} persist
 */
treesaver.storage.set = function set(key, value, persist) {
  var store = persist ? window.localStorage : window.sessionStorage;
  store.setItem(key, window.JSON.stringify(value));
};

/**
 * @param {!string} key
 * @return {*} Previously stored value, if any
 */
treesaver.storage.get = function set(key) {
  // Try session storage first, then local
  return window.JSON.parse(
    /** @type {string} */
    (window.sessionStorage.getItem(key) || window.localStorage.getItem(key) || '')
  );
};

/**
 * @param {!string} key
 */
treesaver.storage.clear = function set(key) {
  window.sessionStorage.removeItem(key);
  window.localStorage.removeItem(key);
};

/**
 * Returns a list of keys currently used in storage
 *
 * @param {string=} prefix
 * @return {!Array.<string>}
 */
treesaver.storage.getKeys_ = function(prefix) {
  var all_keys = [],
      i, len, key,
      prefix_len;

  prefix = prefix || '';
  prefix_len = prefix.length;

  for (i = 0, len = window.localStorage.length; i < len; i += 1) {
    key = window.localStorage.key(i);
    if (key && (!prefix || prefix === key.substr(0, prefix_len))) {
      all_keys.push(window.localStorage.key(i));
    }
  }

  for (i = 0, len = window.sessionStorage.length; i < len; i += 1) {
    key = window.sessionStorage.key(i);
    if (all_keys.indexOf(key) === -1 &&
        (!prefix || prefix === key.substr(0, prefix_len))) {
      all_keys.push(key);
    }
  }

  return all_keys;
};

/**
 * Cleans up space in localStorage
 * @param {string=} prefix
 * @param {!Array.<string>=} whitelist
 */
treesaver.storage.clean = function clean(prefix, whitelist) {
  var blacklist = [];
  treesaver.storage.getKeys_(prefix).forEach(function (key) {
    if (!whitelist || whitelist.indexOf(key) === -1) {
      treesaver.storage.clear(key);
    }
  });
};

// Storage helper functions only needed for browsers that don't have
// native support
if (!treesaver.capabilities.SUPPORTS_LOCALSTORAGE) {
  treesaver.debug.warn('Using fake localStorage');

  /**
   * In-memory data store
   *
   * @private
   * @type {Object.<string, *>}
   */
  treesaver.storage.dataStore_ = {};

  // Override for browsers without native storage
  treesaver.storage.set = function set(key, value, persist) {
    treesaver.storage.dataStore_[key] = value;
  };

  // Override for browsers without native storage
  treesaver.storage.get = function set(key) {
    return treesaver.storage.dataStore_[key];
  };

  // Override for browsers without native storage
  treesaver.storage.clear = function set(key) {
    delete treesaver.storage.dataStore_[key];
  };

  // Override for browsers without native storage
  treesaver.storage.getKeys_ = function(prefix) {
    return [];
  };
}
