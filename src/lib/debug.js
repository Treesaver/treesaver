/**
 * @fileoverview Logging functions for use while debugging.
 */

goog.provide('treesaver.debug');

goog.require('treesaver.capabilities');
goog.require('treesaver.scheduler');

/**
 * Message queue for IOS debugging
 *
 * @type {Array.<string>}
 */
treesaver.debug.messageQueue_ = [];

if (goog.DEBUG && treesaver.capabilities.IS_NATIVE_APP) {
  // Outputs items from the queue at a limited rate, because the logging
  // "API" used can't handle many messages at once (will merge into one)
  treesaver.scheduler.repeat(function() {
    var msg = treesaver.debug.messageQueue_.pop();

    if (msg) {
      msg = window.escape(msg);
      document.location = "ts://log/" + msg;
    }
  }, 50, Infinity);
}

/**
 * Original load time of debug code
 *
 * @const
 * @type {number}
 */
treesaver.debug.startupTime_ = goog.now();

/**
 * Creates a timestamp for a log entry
 *
 * @return {!string}
 */
treesaver.debug.timestamp_ = function() {
  return '[' + (goog.now() - treesaver.debug.startupTime_).toFixed(3) / 1000 + 's] ';
};

/**
 * Log a message
 * @param {!string} msg
 */
treesaver.debug.info = function(msg) {
  if (goog.DEBUG && window.console) {
    msg = treesaver.debug.timestamp_() + msg;

    if (window.TS_WITHIN_NATIVE_IOS_APP) {
      treesaver.debug.messageQueue_.push(msg);
    }
    else if ('info' in window.console) {
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
treesaver.debug.log = function(msg) {
  if (goog.DEBUG && window.console) {
    msg = treesaver.debug.timestamp_() + msg;

    if (window.TS_WITHIN_NATIVE_IOS_APP) {
      treesaver.debug.messageQueue_.push(msg);
    }
    else if ('debug' in window.console) {
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
treesaver.debug.warn = function(msg) {
  if (goog.DEBUG && window.console) {
    msg = treesaver.debug.timestamp_() + msg;

    if (window.TS_WITHIN_NATIVE_IOS_APP) {
      treesaver.debug.messageQueue_.push(msg);
    }
    else if ('warn' in window.console) {
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
treesaver.debug.error = function(msg) {
  if (goog.DEBUG && window.console) {
    msg = treesaver.debug.timestamp_() + msg;

    if (window.TS_WITHIN_NATIVE_IOS_APP) {
      treesaver.debug.messageQueue_.push(msg);
    }
    else if ('error' in window.console) {
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
treesaver.debug.assert = function(assertion, msg) {
  if (goog.DEBUG && window.console) {
    if (window.TS_WITHIN_NATIVE_IOS_APP) {
      if (!assertion) {
        treesaver.debug.messageQueue_.push('Assertion failed: ' + msg);
      }
    }
    else if ('assert' in window.console) {
      window.console['assert'](assertion, msg);
    }
    else if (!assertion) {
      treesaver.debug.error('Assertion failed: ' + msg);
    }
  }
};

treesaver.debug.info('Running in DEBUG mode');
