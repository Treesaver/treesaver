/**
 * @fileoverview Logging functions for use while debugging.
 */

goog.provide('treesaver.debug');

goog.require('treesaver.capabilities');

goog.scope(function() {
  var debug = treesaver.debug;

  /**
   * Original load time of debug code
   *
   * @const
   * @type {number}
   */
  debug.startupTime_ = goog.now();

  /**
   * Creates a timestamp for a log entry
   *
   * @return {!string}
   */
  debug.timestamp_ = function() {
    return '[' + (goog.now() - debug.startupTime_).toFixed(3) / 1000 + 's] ';
  };

  /**
   * Log a message
   * @param {!string} msg
   */
  debug.info = function(msg) {
    if (goog.DEBUG && window.console) {
      msg = debug.timestamp_() + msg;

      if ('info' in window.console) {
        window.console['info'](msg);
      }
      else {
        window.console.log(msg);
      }
    }
  };

  /**
   * Log a message
   * @param {!string} msg
   */
  debug.log = function(msg) {
    if (goog.DEBUG && window.console) {
      msg = debug.timestamp_() + msg;

      if ('debug' in window.console) {
        window.console['debug'](msg);
      }
      else {
        window.console.log(msg);
      }
    }
  };

  /**
   * Log a message
   * @param {!string} msg
   */
  debug.warn = function(msg) {
    if (goog.DEBUG && window.console) {
      msg = debug.timestamp_() + msg;

      if ('warn' in window.console) {
        window.console['warn'](msg);
      }
      else {
        window.console.log(msg);
      }
    }
  };

  /**
   * Log a message
   * @param {!string} msg
   */
  debug.error = function(msg) {
    if (goog.DEBUG && window.console) {
      msg = debug.timestamp_() + msg;

      if ('error' in window.console) {
        window.console['error'](msg);
      }
      else {
        window.console.log(msg);
      }
    }
  };

  /**
   * Assert helper
   * @param {boolean} assertion
   * @param {?string} msg
   */
  debug.assert = function(assertion, msg) {
    if (goog.DEBUG && window.console) {
      if ('assert' in window.console) {
        window.console['assert'](assertion, msg);
      }
      else if (!assertion) {
        debug.error('Assertion failed: ' + msg);
      }
    }
  };

  debug.info('Running in DEBUG mode');
});
