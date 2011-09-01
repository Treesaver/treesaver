/**
 * @fileoverview Event helper functions.
 */

goog.provide('treesaver.events');

goog.require('treesaver.debug');

goog.scope(function() {
  var events = treesaver.events,
      debug = treesaver.debug;

  /**
   * Create an event and fire it
   *
   * @param {!*} obj
   * @param {!string} type
   * @param {Object=} data
   */
  events.fireEvent = function(obj, type, data) {
    var e = document.createEvent('UIEvents'),
        cur,
        val;

    // TODO: Test cancelling
    e.initEvent(type, false, true);
    // Copy provided data into event object
    if (data) {
      for (cur in data) {
        e[cur] = data[cur];
      }
    }

    return obj.dispatchEvent(e);
  };

  /**
   * Add an event listener to an element
   *
   * @param {!*} obj
   * @param {!string} type
   * @param {!function()|!Object} fn
   */
  events.addListener = function(obj, type, fn) {
    // Help out while debugging, but don't pay the performance hit
    // for a try/catch in production
    if (goog.DEBUG) {
      try {
        obj.addEventListener(type, fn, false);
      }
      catch (ex) {
        debug.error('Could not add ' + type + ' listener to: ' + obj);
        debug.error('Exception ' + ex);
      }
    }
    else {
      obj.addEventListener(type, fn, false);
    }
  };

  /**
   * Remove an event listener from an element
   *
   * @param {!*} obj
   * @param {!string} type
   * @param {!function()|!Object} fn
   */
  events.removeListener = function(obj, type, fn) {
    // Help out with debugging, but only in debug
    if (goog.DEBUG) {
      try {
        obj.removeEventListener(type, fn, false);
      }
      catch (ex) {
        debug.error('Could not remove ' + type + ' listener from: ' + obj);
        debug.error('Exception ' + ex);
      }
    }
    else {
      obj.removeEventListener(type, fn, false);
    }
  };
});

// Expose event helper functions via externs
goog.exportSymbol('treesaver.addListener', treesaver.events.addListener);
goog.exportSymbol('treesaver.removeListener', treesaver.events.removeListener);
