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
  this.contentContainer = /** @type {Element} */ (node.firstChild);
};

/**
 * DOM reference to the content container
 *
 * @type {Element}
 */
treesaver.ui.Scrollable.prototype.contentContainer;

/**
 * DOM reference to the scroll container
 *
 * @type {Element}
 */
treesaver.ui.Scrollable.prototype.node;

/**
 * Size of viewable area within scroller
 *
 * @type {treesaver.dimensions.Size}
 */
treesaver.ui.Scrollable.prototype.viewportSize;

/**
 * Size of content within the scroller
 *
 * @type {treesaver.dimensions.Size}
 */
treesaver.ui.Scrollable.prototype.contentSize;

/**
 * Position of scroller
 *
 * @type {number}
 */
treesaver.ui.Scrollable.prototype.scrollPosX;

/**
 * Position of scroller
 *
 * @type {number}
 */
treesaver.ui.Scrollable.prototype.scrollPosY;

/**
 * Refresh the viewport and content sizes based on current DOM measurements
 */
treesaver.ui.Scrollable.prototype.refreshDimensions = function() {
  // TODO: Consider setting position:absolute in order to get correct width?
  this.viewportSize = treesaver.dimensions.getSize(this.node);
  this.contentSize = treesaver.dimensions.getSize(this.contentContainer);
  this.scrollPosX = this.scrollPosX || 0;
  this.scrollPosY = this.scrollPosY || 0;
  this.setOffset(0, 0, true);
};

/**
 * Is the given node within the scroller?
 *
 * @param {!Element} node
 * @return {boolean}
 */
treesaver.ui.Scrollable.prototype.contains = function(node) {
  return this.contentContainer.contains(node);
};

/**
 * Crop the offset to be within scroll bounds
 *
 * @param {number} x
 * @param {number} y
 * @return {{ x:number, y:number }}
 */
treesaver.ui.Scrollable.prototype.cropOffset = function(x, y) {
  return {
    x: Math.max(0, Math.min(this.contentSize.w - this.viewportSize.w, x)),
    y: Math.max(0, Math.min(this.contentSize.h - this.viewportSize.h, y))
  };
};

/**
 * Set the scroll offset
 *
 * @param {number} x
 * @param {number} y
 * @param {boolean=} set
 */
treesaver.ui.Scrollable.prototype.setOffset = function(x, y, set) {
  var cropped = this.cropOffset(this.scrollPosX + x, this.scrollPosY + y);

  console.log('CroppedX: ' + cropped.x);

  if (set) {
    this.scrollPosX = cropped.x;
    this.scrollPosY = cropped.y;
  }

  treesaver.dimensions.setOffset(/** @type {!Element} */ (this.contentContainer), -cropped.x, -cropped.y);
};

/**
 * Initialize the DOM for a scrollable element, creating the necessary
 * structures for later scrolling
 *
 * @param {!Element} node
 */
treesaver.ui.Scrollable.initDom = function(node) {
  // Create a container that will hold the children of the node
  var div = document.createElement('div');
  treesaver.dom.addClass(div, 'scroll-container');

  if (WITHIN_IOS_WRAPPER || treesaver.capabilities.SUPPORTS_TOUCH) {
    // Need dummy handler in order to get bubbled events
    node.setAttribute('onclick', 'void(0)');
  }

  // Move all elements into container
  while (node.firstChild) {
    div.appendChild(node.firstChild);
  }
  // Move container into prime node
  node.appendChild(div);
};
