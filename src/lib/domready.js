/**
 * @fileoverview Fire an event when the dom is ready
 */

goog.provide('treesaver.domready');

goog.require('treesaver.events');
goog.require('treesaver.scheduler');

/**
 * Events fired
 *
 * @const
 * @type {Object.<string, string>}
 */
treesaver.domready.events = {
  READY: 'treesaver.domready.ready'
};

/**
 * Whether the DOM is ready
 * @return {boolean} True if ready
 */
treesaver.domready.ready = function() {
  return treesaver.domready.documentReady_;
};

/**
 * Whether the document is fully loaded
 * @return {boolean} True if ready
 */
treesaver.domready.loaded = function() {
  return treesaver.domready.documentLoaded_;
};

/**
 * Whether the document is ready yet
 *
 * @private
 * @type {boolean}
 */
treesaver.domready.documentReady_ = false;

/**
 * Whether the document is fully loaded yet
 *
 * @private
 * @type {boolean}
 */
treesaver.domready.documentLoaded_ = false;

/**
 * Mark document as loaded and fire event
 * @private
 */
treesaver.domready.ready_ = function() {
  // Ignore calls after load
  if (treesaver.domready.documentReady_) {
    return;
  }

  // Make sure the body is actually accessible, false positive
  // happens in some browsers
  if (!document.body) {
    treesaver.debug.error('DOMReady without document.body');

    // TODO: Schedule another poll?
    return;
  }

  treesaver.domready.documentReady_ = true;

  treesaver.debug.info('DOM is ready');

  // Remove event handlers
  treesaver.events.removeListener(
    document,
    'DOMContentLoaded',
    treesaver.domready
  );
  treesaver.events.removeListener(
    document,
    'readystatechange',
    treesaver.domready
  );
  treesaver.events.removeListener(window, 'load', treesaver.domready);

  // No longer needed
  delete treesaver.domready.elementCount_;

  // Fire event
  treesaver.events.fireEvent(document, treesaver.domready.events.READY)
};

/**
 * Count of all the elements in the tree, used as a hacky measure
 * as to whether the document has finished loaded
 *
 * @private
 * @type {number}
 */
treesaver.domready.elementCount_;

/**
 * Check if the DOM is ready yet
 */
treesaver.domready.pollState_ = function() {
  // Use readystate for browsers that support it
  // Firefox 3.6+, Webkit/Chrome, Opera
  if ('readyState' in document) {
    if (/complete|loaded/.test(document.readyState)) {
      treesaver.domready.ready_();
    }

    return;
  }

  treesaver.debug.info('Manually polling document ready state');

  // TODO: Find a better way of detecting load?
  // Or, just don't worry about it since soon there won't be any
  // browsers left that don't support readyState

  var elementCount = document.getElementsByTagName('*').length;

  if (!treesaver.domready.elementCount_) {
    // Set the element count
    treesaver.domready.elementCount_ = elementCount;

    // Schedule another check
    treesaver.scheduler.delay(treesaver.domready.pollState_, 100);
  }
  else if (elementCount !== treesaver.domready.elementCount_) {
    // The DOM hasn't finished loading, because our element count is
    // changing.
    //
    // In this case, we don't bother setting up another timer, since
    // we can count on at least the load event firing for us
    // TODO: Confirm this
  }
  else {
    // Element count is stable, assume that means the DOM is ready
    treesaver.domready.ready_();

    return;
  }
};

/**
 * Event handler
 *
 * @param {Event=} e
 */
treesaver.domready['handleEvent'] = function(e) {
  // IE doesn't do events correctly
  // TODO: Use event library
  if (SUPPORT_IE && !e) {
    e = window.event;
    e.target = e.target || e.srcElement;
  }

  // Make sure it's not coming from a script tag or something else
  // that bubbled up
  if (!(e.target === document || e.target === window)) {
    treesaver.debug.warn('Stray loading event from: ' + e.target);

    return;
  }

  treesaver.debug.info('DOM event received: ' + e.type);

  if (/load|DOMContentLoaded/.test(e.type)) {
    treesaver.domready.ready_();
  }
  else {
    treesaver.domready.pollState_();
  }
};

// Attach listeners to watch for loading
// Mozilla/Opera/Webkit support DOMContentLoaded
treesaver.events.addListener(document, 'DOMContentLoaded', treesaver.domready);
treesaver.events.addListener(document, 'readystatechange', treesaver.domready);
treesaver.events.addListener(window, 'load', treesaver.domready);

// Poll state manually in case we are loaded late
treesaver.domready.pollState_();
