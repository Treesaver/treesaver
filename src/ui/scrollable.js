/**
 * @fileoverview Helper functions for scrolling elements.
 */

goog.provide('treesaver.ui.Scrollable');

goog.require('treesaver.capabilities');
goog.require('treesaver.dom');

goog.scope(function() {
  var Scrollable = treesaver.ui.Scrollable,
      capabilities = treesaver.capabilities,
      dom = treesaver.dom;

  /**
   * Can this scroller scroll horizontally?
   * @param {!Element} el
   * @return {boolean}
   */
  Scrollable.canScrollHorizontally = function(el) {
    return el.scrollWidth !== el.clientWidth;
  };

  /**
   * Set the scroll offset
   *
   * @param {!Element} el
   * @param {number} x
   * @param {number} y
   * @return {boolean} true if scrolling happened.
   */
  Scrollable.setOffset = function(el, x, y) {
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
  Scrollable.initDom = function(el) {
    if (WITHIN_IOS_WRAPPER || capabilities.SUPPORTS_TOUCH) {
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
  Scrollable.initDomTree = function(root) {
    var els = dom.querySelectorAll('.scroll', root);

    // Root element can be scrollable as well
    if (dom.hasClass(root, 'scroll')) {
      els.unshift(root);
    }

    // Initialize all
    els.forEach(Scrollable.initDom);
  };
});
