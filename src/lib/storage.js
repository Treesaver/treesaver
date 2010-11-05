/**
 * @fileoverview Simple online/offline storage system.
 */

goog.provide('treesaver.storage');

goog.require('treesaver.array'); // forEach
goog.require('treesaver.debug');
goog.require('treesaver.json');

/**
 * @param {!string} key
 * @param {!*} value
 * @param {boolean=} persist
 */
treesaver.storage.set = function set(key, value, persist) {
  var store = persist ? window.localStorage : window.sessionStorage;

  // iPad throws QUOTA_EXCEEDED_ERR frequently here, even though we're not
  // using that much storage
  // Clear the storage first in order to avoid this error

  // IE9 throws if you remove an item that does not exist
  // TODO: Clean this once IE fixes the bug
  // Ref: https://connect.microsoft.com/IE/feedback/details/613497/web-storage-remove-method-not-working-according-to-the-spec#
  if (!SUPPORT_IE || store.getItem(key)) {
    store.removeItem(key);
  }

  try {
    store.setItem(key, treesaver.json.stringify(value));
  }
  catch (ex) {
    // Still happened, not much we can do about it
    // TODO: Do something about it? :)
  }
};

/**
 * @param {!string} key
 * @return {*} Previously stored value, if any.
 */
treesaver.storage.get = function set(key) {
  // Session take precedence over local
  var val = window.sessionStorage.getItem(key) || window.localStorage.getItem(key);

  if (val) {
    return treesaver.json.parse( /** @type {string} */ (val));
  }
  else {
    return null;
  }
};

/**
 * @param {!string} key
 */
treesaver.storage.clear = function set(key) {
  // IE9 goes against spec here and throws an exception
  // if the key doesn't exist. Be defensive
  if (!SUPPORT_IE || window.sessionStorage.getItem(key)) {
    window.sessionStorage.removeItem(key);
  }
  if (!SUPPORT_IE || window.localStorage.getItem(key)) {
    window.localStorage.removeItem(key);
  }
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
  treesaver.storage.getKeys_(prefix).forEach(function(key) {
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
