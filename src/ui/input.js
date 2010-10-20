/**
 * @fileoverview User input helpers.
 */

goog.provide('treesaver.ui.input');

goog.require('treesaver.constants');
goog.require('treesaver.events');
goog.require('treesaver.scheduler');

treesaver.ui.input.load = function() {
  // Setup handlers
  treesaver.events.addListener(document, 'keydown', treesaver.ui.input.keyDown);
  treesaver.events.addListener(document, 'mousewheel', treesaver.ui.input.mouseWheel);
  treesaver.events.addListener(document, 'DOMMouseScroll', treesaver.ui.input.mouseWheel);
  treesaver.events.addListener(document, 'mousedown', treesaver.ui.input.mouseDown);
  treesaver.events.addListener(document, 'touchstart', treesaver.ui.input.mouseDown);
  // On desktops, make any mouse move show the UI
  treesaver.events.addListener(document, 'mouseover', treesaver.ui.input.mouseOver);
  treesaver.events.addListener(document, 'click', treesaver.ui.input.click);
  treesaver.events.addListener(document, treesaver.ui.input.events.ACTIVE, treesaver.ui.input.active);

  // Start idle timer in a bit
  treesaver.ui.input.active();
};

treesaver.ui.input.unload = function() {
  // Remove all handlers
  treesaver.events.removeListener(document, 'keydown', treesaver.ui.input.keyDown);
  treesaver.events.removeListener(document, 'mousewheel', treesaver.ui.input.mouseWheel);
  treesaver.events.removeListener(document, 'DOMMouseScroll', treesaver.ui.input.mouseWheel);
  treesaver.events.removeListener(document, 'mousedown', treesaver.ui.input.mouseDown);
  treesaver.events.removeListener(document, 'touchstart', treesaver.ui.input.mouseDown);
  treesaver.events.removeListener(document, 'mouseover', treesaver.ui.input.mouseOver);
  treesaver.events.removeListener(document, 'click', treesaver.ui.input.click);
  treesaver.events.removeListener(document, treesaver.ui.input.events.ACTIVE, treesaver.ui.input.active);

  // Might have stray mouse listeners ...
  treesaver.ui.input.removeMouseHandlers_();
};

/**
 * Events fired by this library
 *
 * @const
 * @type {!Object.<string, string>}
 */
treesaver.ui.input.events = {
  KEYDOWN: 'treesaver.keydown',
  CLICK: 'treesaver.click',
  MOUSEWHEEL: 'treesaver.mousewheel',
  MOUSEUP: 'treesaver.mouseup',
  MOUSEDOWN: 'treesaver.mousedown',
  MOUSEMOVE: 'treesaver.mousemove',
  MOUSECANCEL: 'treesaver.mousecancel',
  ACTIVE: 'treesaver.active',
  IDLE: 'treesaver.idle'
};

/**
 * Sanitize and pass on key events
 *
 * @param {!Event} e
 */
treesaver.ui.input.keyDown = function(e) {
  // Fire the event
  var ret = treesaver.events.fireEvent(
    document,
    treesaver.ui.input.events.KEYDOWN,
    {
      key: e.keyCode,
      el: treesaver.ui.input.findTarget_(e.target),
      specialKey: treesaver.ui.input.specialKeyPressed_(e)
    }
  );

  // Check if we need to prevent
  if (!ret) {
    e.preventDefault();
  }

  return ret;
};

/**
 * The last time a mousewheel event was received
 *
 * @private
 * @type {number}
 */
treesaver.ui.input.lastMouseWheel;

/**
 * Sanitize and pass on mousewheel events
 *
 * @param {!Event} e
 */
treesaver.ui.input.mouseWheel = function(e) {
  if (treesaver.ui.input.specialKeyPressed_(e)) {
    // Ignore if special key is down (user could be zooming)
    return true;
  }

  var now = goog.now();

  if (treesaver.ui.input.lastMouseWheel &&
      ((now - treesaver.ui.input.lastMouseWheel) < MOUSE_WHEEL_INTERVAL)) {
    // Ignore if too frequent (magic mouse)
    return true;
  }

  treesaver.ui.input.lastMouseWheel = now;

  // Firefox handles this differently than others
  // http://adomas.org/javascript-mouse-wheel/
  var delta = e.wheelDelta ? e.wheelDelta : e.detail ? -e.detail : 0;

  var ret = treesaver.events.fireEvent(
    document,
    treesaver.ui.input.events.MOUSEWHEEL,
    {
      delta: delta,
      el: treesaver.ui.input.findTarget_(e.target)
    }
  );

  if (!ret) {
    e.preventDefault();
  }

  return ret;
};

/**
 *
 * @param {!Event} e
 */
treesaver.ui.input.mouseDown = function(e) {
  var isTouch = !!e.touches,
      retVal,
      mouseData;

  if (isTouch) {
    // Ignore multitouch
    if (e.touches.length > 1) {
      treesaver.debug.info('Multi-touch ignored');

      return;
    }

    // Listen for touch events
    treesaver.events.addListener(document, 'touchmove', treesaver.ui.input.mouseMove);
    treesaver.events.addListener(document, 'touchend', treesaver.ui.input.mouseUp);
    treesaver.events.addListener(document, 'touchcancel', treesaver.ui.input.mouseCancel);
  }
  else {
    // Ignore if not done with a modifier key
    if (!treesaver.ui.input.specialKeyPressed_(e)) {
      treesaver.debug.info('Mousedown ignored due to lack of modifier key');

      return;
    }

    // Ignore if it's not a left-click
    if ('which' in e && e.which !== 1 || e.button) {
      treesaver.debug.info('Click ignored due to non-left click');

      return;
    }

    // Listen for mouse events
    treesaver.events.addListener(document, 'mousemove', treesaver.ui.input.mouseMove);
    treesaver.events.addListener(document, 'mouseup', treesaver.ui.input.mouseUp);
  }

  // Collect relevant mouse data
  mouseData = treesaver.ui.input.getMouseData_(e, isTouch);

  retVal = treesaver.events.fireEvent(document, treesaver.ui.input.events.MOUSEDOWN, mouseData);

  if (!retVal || !isTouch) {
    e.preventDefault();
  }

  return retVal;
};

/**
 *
 * @param {!Event} e
 */
treesaver.ui.input.mouseMove = function(e) {
  // Collect relevant mouse data
  var mouseData = treesaver.ui.input.getMouseData_(e, !!e.touches),
      retVal;

  // Fire event
  retVal = treesaver.events.fireEvent(document, treesaver.ui.input.events.MOUSEMOVE, mouseData);

  if (!retVal || !e.touches) {
    e.preventDefault();
  }

  return retVal;
};

/**
 *
 * @param {!Event} e
 */
treesaver.ui.input.mouseUp = function(e) {
  var mouseData = treesaver.ui.input.getMouseData_(e, !!e.touches),
      retVal;

  // Clean up
  treesaver.ui.input.removeMouseHandlers_();

  // Fire event
  retVal = treesaver.events.fireEvent(document, treesaver.ui.input.events.MOUSEUP, mouseData);

  if (!retVal || !e.touches) {
    e.preventDefault();
  }
  else {
    // Show UI if no action happened (perhaps it was a tap on the screen?)
    treesaver.events.fireEvent(document, treesaver.ui.input.events.ACTIVE);
  }

  return retVal;
};

/**
 * Desktop-only handler to make sure we don't hide UI when the user is trying
 * to use it
 *
 * @param {!Event} e
 */
treesaver.ui.input.mouseOver = function(e) {
  // Don't do anything on touch devices
  if (!e.touches) {
    // Need to make sure UI is visible if a user is trying to click on it
    treesaver.events.fireEvent(document, treesaver.ui.input.events.ACTIVE);
  }
};

/**
 * Unhook listeners and clear stored data
 *
 * @param {!Event} e
 */
treesaver.ui.input.mouseCancel = function(e) {
  // Make sure to clean up
  treesaver.ui.input.removeMouseHandlers_();

  // Not exactly sure when this gets called as a real handler, so not sure if
  // an event should be fired
  treesaver.events.fireEvent(document, treesaver.ui.input.events.MOUSECANCEL);
};

/**
 * Unhook mouse/touch listeners
 *
 * @private
 */
treesaver.ui.input.removeMouseHandlers_ = function() {
  treesaver.events.removeListener(document, 'touchmove', treesaver.ui.input.mouseMove);
  treesaver.events.removeListener(document, 'touchend', treesaver.ui.input.mouseUp);
  treesaver.events.removeListener(document, 'touchcancel', treesaver.ui.input.mouseCancel);
  treesaver.events.removeListener(document, 'mousemove', treesaver.ui.input.mouseMove);
  treesaver.events.removeListener(document, 'mouseup', treesaver.ui.input.mouseUp);

  // Clear mouse data
  treesaver.ui.input.mouseData_ = null;
};

/**
 *
 * @param {!Event} e
 */
treesaver.ui.input.click = function(e) {
  // Ignore if done with a modifier key
  if (treesaver.ui.input.specialKeyPressed_(e)) {
    treesaver.debug.info('Click ignored due to modifier key');

    return;
  }

  // Ignore if it's not a left-click
  if ('which' in e && e.which !== 1 || e.button) {
    treesaver.debug.info('Click ignored due to non-left click');

    return;
  }

  var ret = treesaver.events.fireEvent(document, treesaver.ui.input.events.CLICK, {
    // Sanitize the click target
    el: treesaver.ui.input.findTarget_(e.target)
  });

  if (!ret) {
    e.preventDefault();
  }
  else {
    // Show UI if no action happened (perhaps it was a tap on the screen?)
    treesaver.events.fireEvent(document, treesaver.ui.input.events.ACTIVE);
  }

  return ret;
};

/**
 * @param {!Event=} e
 */
treesaver.ui.input.active = function(e) {
  // Fire the idle event on a timer using debouncing, which delays the function
  // when recieving repeated calls
  treesaver.scheduler.debounce(
    treesaver.events.fireEvent,
    UI_IDLE_INTERVAL,
    [document, treesaver.ui.input.events.IDLE],
    false,
    'idletimer'
  );
};

/**
 * @private
 * @type {Object}
 */
treesaver.ui.input.mouseData_;

/**
 * Helper for collecting mouse/touch positional data from events
 *
 * @private
 * @param {!Event} e
 * @param {boolean} isTouch
 * @return {Object}
 */
treesaver.ui.input.getMouseData_ = function(e, isTouch) {
  var posX, posY;

  if (isTouch && e.touches[0]) {
    posX = e.touches[0].pageX;
    posY = e.touches[0].pageY;
  }
  else {
    posX = e.pageX;
    posY = e.pageY;
  }

  if (!treesaver.ui.input.mouseData_ || /touchstart|mousedown/.test(e.type)) {
    treesaver.ui.input.mouseData_ = {
      startX: posX,
      startY: posY,
      startTime: goog.now(),
      el: treesaver.ui.input.findTarget_(e.target),
      move: false,
      isTouch: isTouch
    };
  }
  else if (/touchmove|mousemove/.test(e.type)) {
    treesaver.ui.input.mouseData_.move = true;
    treesaver.ui.input.mouseData_.deltaX = posX - treesaver.ui.input.mouseData_.startX;
    treesaver.ui.input.mouseData_.deltaY = posY - treesaver.ui.input.mouseData_.startY;
    treesaver.ui.input.mouseData_.deltaTime = goog.now() - treesaver.ui.input.mouseData_.startTime;
  }
  else {
    if (posX && posY) {
      treesaver.ui.input.mouseData_.deltaX = posX - treesaver.ui.input.mouseData_.startX;
      treesaver.ui.input.mouseData_.deltaY = posY - treesaver.ui.input.mouseData_.startY;
    }
    treesaver.ui.input.mouseData_.deltaTime = goog.now() - treesaver.ui.input.mouseData_.startTime;
  }

  return treesaver.ui.input.mouseData_;
};

/**
 * Sanitize the target, which can be a textNode in Safari
 *
 * @private
 * @param {?EventTarget} node
 * @return {!Element}
 */
treesaver.ui.input.findTarget_ = function(node) {
  if (!node) {
    node = document.body;
  }
  else if (node.nodeType !== 1 && node.parentNode) {
    // Safari Bug that gives you textNode on events
    node = node.parentNode || document.body;
  }

  // Cast for compiler
  return /** @type {!Element} */ (node);
};

/**
 * Whether one of the control/shift/alt/etc keys were pressed at the time
 * of the event
 *
 * @private
 * @param {!Event} e
 * @return {boolean} True if at least one of those keys was pressed.
 */
treesaver.ui.input.specialKeyPressed_ = function _specialKeyPressed(e) {
  return e.ctrlKey || e.shiftKey || e.altKey || e.metaKey;
};
