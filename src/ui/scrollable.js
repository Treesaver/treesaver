/**
 * @fileoverview The scrollable class.
 */

goog.provide('treesaver.ui.Scrollable');

/**
 * Scrollable
 *
 * @param {!Element} node
 * @constructor
 */
treesaver.ui.Scrollable = function(node) {
  this.node = node;
};

/**
 * DOM reference to the scroll container
 *
 * @type {Element}
 */
treesaver.ui.Scrollable.prototype.node;

/**
 * Can this scroller scroll horizontally?
 * @return {boolean}
 */
treesaver.ui.Scrollable.prototype.hasHorizontal = function() {
  return this.node.scrollWidth !== this.node.clientWidth;
};

/**
 * Refresh the viewport and content sizes based on current DOM measurements
 */
treesaver.ui.Scrollable.prototype.refreshDimensions = function() {
};

/**
 * Is the given node within the scroller?
 *
 * @param {!Element} node
 * @return {boolean}
 */
treesaver.ui.Scrollable.prototype.contains = function(node) {
  return this.node.contains(node);
};

/**
 * Set the scroll offset
 *
 * @param {number} x
 * @param {number} y
 * @return {boolean} true if scrolling happened
 */
treesaver.ui.Scrollable.prototype.setOffset = function(x, y) {
  var left = this.node.scrollLeft,
      top = this.node.scrollTop;

  this.node.scrollLeft += x;
  this.node.scrollTop += y;

  // Check if values changed
  return this.node.scrollLeft !== left || this.node.scrollTop !== top;
};

/**
 * Initialize the DOM for a scrollable element, creating the necessary
 * structures for later scrolling
 *
 * @param {!Element} node
 */
treesaver.ui.Scrollable.initDom = function(node) {
  if (WITHIN_IOS_WRAPPER || treesaver.capabilities.SUPPORTS_TOUCH) {
    // Need dummy handler in order to get bubbled events
    node.setAttribute('onclick', 'void(0)');
  }

  // TODO: Ensure that overflow is set correctly?
};
