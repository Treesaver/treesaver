/**
 * @fileoverview Helper functions for scrolling elements.
 */

goog.provide('treesaver.ui.Scrollable');

/**
 * Can this scroller scroll horizontally?
 * @param {!Element} el
 * @return {boolean}
 */
treesaver.ui.Scrollable.canScrollHorizontally = function(el) {
  return el.scrollWidth !== el.clientWidth;
};

/**
 * Set the scroll offset
 *
 * @param {!Element} el
 * @param {number} x
 * @param {number} y
 * @return {boolean} true if scrolling happened
 */
treesaver.ui.Scrollable.setOffset = function(el, x, y) {
  var left = el.scrollLeft,
      top = el.scrollTop;

  el.scrollLeft += x;
  el.scrollTop += y;

  // Check if values changed
  return el.scrollLeft !== left || el.scrollTop !== top;
};

/**
 * Initialize the DOM for a scrollable element, creating the necessary
 * structures for later scrolling
 *
 * @param {!Element} el
 */
treesaver.ui.Scrollable.initDom = function(el) {
  if (WITHIN_IOS_WRAPPER || treesaver.capabilities.SUPPORTS_TOUCH) {
    // Need dummy handler in order to get bubbled events
    el.setAttribute('onclick', 'void(0)');
  }

  // TODO: Ensure that overflow is set correctly?
};

/**
 * Look for scrollable elements within a DOM tree and initialize
 *
 * @param {!Element} root
 */
treesaver.ui.Scrollable.initDomTree = function(root) {
  var els = treesaver.dom.querySelectorAll('.scroll', root);

  // Root element can be scrollable as well
  if (treesaver.dom.hasClass(root, 'scroll')) {
    els.unshift(root);
  }

  // Initialize all
  els.forEach(treesaver.ui.Scrollable.initDom);
};
