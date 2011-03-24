/**
 * @fileoverview Event helper functions.
 */

goog.provide('treesaver.events');

goog.require('treesaver.array');
goog.require('treesaver.constants');
goog.require('treesaver.debug'); // forEach

/**
 * Create an event and fire it
 *
 * @param {!*} obj
 * @param {!string} type
 * @param {Object=} data
 */
treesaver.events.fireEvent = function(obj, type, data) {
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
 * @param {!function()|Object} fn
 */
treesaver.events.addListener = function(obj, type, fn) {
  // Help out while debugging, but don't pay the performance hit
  // for a try/catch in production
  if (goog.DEBUG) {
    try {
      obj.addEventListener(type, fn, false);
    }
    catch(ex) {
      treesaver.debug.error('Could not add ' + type + ' listener to: ' + obj);
      treesaver.debug.error('Exception ' + ex);
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
 * @param {!function()|Object} fn
 */
treesaver.events.removeListener = function(obj, type, fn) {
  // Help out with debugging, but only in debug
  if (goog.DEBUG) {
    try {
      obj.removeEventListener(type, fn, false);
    }
    catch (ex) {
      treesaver.debug.error('Could not remove ' + type + ' listener from: ' + obj);
      treesaver.debug.error('Exception ' + ex);
    }
  }
  else {
    obj.removeEventListener(type, fn, false);
  }
};

// Need to patch functions for IE
if (SUPPORT_IE && (!('addEventListener' in document))) {
  treesaver.debug.warn('Using IE event model');

  // IE's lack of DOM Level 2 support really sucks here, for a few reasons
  //   1. No support for custom events, only the ones built-in
  //   2. No support for EventHandler.handleEvent (makes binding easy)
  //   3. Choosing to use attachEvent instead of addEventListener in general
  //
  // So, what's a girl to do? Well, we'll just take over and deal with
  // event handling and dispatching ourselves.
  //
  // First up, we need the list of events that IE supports natively

  // From: http://msdn.microsoft.com/en-us/library/ms533051(VS.85).aspx
  /**
   * @const
   * @type {Array.<string>}
   */
  var IE_NATIVE_EVENTS = [
    'abort', 'activate', 'afterprint', 'afterupdate',
    'beforeactivate', 'beforecopy', 'beforecut',
    'beforedeactivate', 'beforeeditfocus', 'beforepaste',
    'beforeprint', 'beforeunload', 'beforeupdate', 'blur',
    'bounce', 'cellchange', 'change', 'click',
    'contextmenu', 'controlselect', 'copy', 'cut',
    'dataavailable', 'datasetchanged', 'datasetcomplete',
    'dblclick', 'deactivate', 'drag', 'dragend',
    'dragenter', 'dragleave', 'dragover', 'dragstart',
    'drop', 'error', 'error', 'errorupdate', 'filterchange',
    'finish', 'focus', 'focusin', 'focusout', 'hashchange',
    'help', 'keydown', 'keypress', 'keyup', 'layoutcomplete',
    'load', 'losecapture', 'message', 'mousedown',
    'mouseenter', 'mouseleave', 'mousemove', 'mouseout',
    'mouseover', 'mouseup', 'mousewheel', 'move',
    'moveend', 'movestart', 'offline', 'online', 'page',
    'paste', 'progress', 'propertychange', 'readystatechange',
    'readystatechange', 'reset', 'resize', 'resizeend',
    'resizestart', 'rowenter', 'rowexit', 'rowsdelete',
    'rowsinserted', 'scroll', 'select', 'selectionchange',
    'selectstart', 'start', 'stop', 'storage',
    'storagecommit', 'submit', 'timeout', 'unload'
  ];

  /**
   * @this {Event}
   */
  treesaver.events.preventDefault = function() {
    this.returnValue = false;
  };

  /**
   * @this {Event}
   */
  treesaver.events.stopPropagation = function() {
    this.cancelBubble = true;
  };

  treesaver.events.fireEvent = function(obj, type, data) {
    var e = document.createEventObject(),
        cur;

    e.type = type;

    // Copy provided data into event object
    if (data) {
      for (cur in data) {
        e[cur] = data[cur];
      }
    }

    // Add 'preventDefault' if it doesn't already exist
    if (!e.preventDefault) {
      e.preventDefault = treesaver.events.preventDefault;
    }

    if (!e.stopPropagation) {
      e.stopPropagation = treesaver.events.stopPropagation;
    }

    // If it's an event IE supports natively, fire it through the
    // event system
    if (true || IE_NATIVE_EVENTS.indexOf(type) !== -1) {
      try {
        return obj.fireEvent('on' + type, e);
      }
      catch (ex) {
        // Well, I guess it didn't support it after all, let's fallback
        // to our backup below
      }
    }

    // TODO: Need to create a new "event" object, so we can track
    // preventDefault / returnValue on our own

    // Not a native event, let's do a manual dispatch since it's a custom
    // event anyway
    if (obj.custom_handlers && obj.custom_handlers[type]) {
      obj.custom_handlers[type].master(e);
    }

    // TODO: Need to match the semantics of dispatchEvent here, and make sure
    // we send the right signals as to when to prevent default
    return false;
  };

  /**
   * @private
   * @param {Element} obj
   * @param {string} type
   * @return {!function()}
   */
  treesaver.events.createMasterHandler_ = function(obj, type) {
    return function(e) {
      // IE doesn't pass the event as a parameter :(
      e = e || window.event;

      // IE uses srcElement instead of target
      e.target = e.target || e.srcElement;

      // Need to set up preventDefault
      e.preventDefault = treesaver.events.preventDefault;

      e.stopPropagation = treesaver.events.stopPropagation;

      // Call each handler
      obj.custom_handlers[type].handlers.forEach(function(fun) {
        // For now, wrap handlers in try/catch
        // TODO: Use a better callback model
        // Hat tip to Dean Edwards for the inspiration
        // http://dean.edwards.name/weblog/2009/03/callbacks-vs-events/
        //
        // TODO: What happens if an event handler removes itself here?
        try {
          if ('handleEvent' in fun) {
            // Dispatch to handleEvent if it's an object
            fun['handleEvent'](e);
          }
          else {
            // Otherwise call handler with correct 'this'
            fun.call(obj, e);
          }
        }
        catch (ex) {
          // Some failure
          treesaver.debug.error('Exception during ' + type + ' handler: ' + ex);
        }
      });
    };
  };

  // From PPK/Dean Edwards
  // http://www.quirksmode.org/blog/archives/2005/10/_and_the_winner_1.html
  treesaver.events.addListener = function(obj, type, fn) {
    // Create storage if it's not there
    if (!obj.custom_handlers) {
      obj.custom_handlers = {};
    }

    // Create storage for this type
    if (!obj.custom_handlers[type]) {
      obj.custom_handlers[type] = {
        handlers: [],
        master: treesaver.events.createMasterHandler_(obj, type)
      };

      // Attach master event, if it's native
      if (IE_NATIVE_EVENTS.indexOf(type) !== -1) {
        obj.attachEvent('on' + type, obj.custom_handlers[type].master);
      }
    }

    // Store the handler
    obj.custom_handlers[type].handlers.push(fn);
  };

  treesaver.events.removeListener = function(obj, type, fn) {
    // Remove the event if it's there
    if (obj.custom_handlers && obj.custom_handlers[type]) {
      var index = obj.custom_handlers[type].handlers.indexOf(fn);
      if (index !== -1) {
        treesaver.array.remove(obj.custom_handlers[type].handlers, index);
      }

      // Do we have any handlers left?
      if (!obj.custom_handlers[type].handlers.length) {
        // Detach event (if necessary)
        if (IE_NATIVE_EVENTS.indexOf(type) !== -1) {
          obj.detachEvent('on' + type, obj.custom_handlers[type].master);
        }

        // Clear out everything
        obj.custom_handlers[type] = null;
      }
    }
  };
}

// Expose event helper functions via externs
goog.exportSymbol('treesaver.addListener', treesaver.events.addListener);
goog.exportSymbol('treesaver.removeListener', treesaver.events.removeListener);
