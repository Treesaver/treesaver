/**
 * @fileoverview Container data structure
 */

goog.provide('treesaver.layout.Container');

goog.require('treesaver.dimensions');
goog.require('treesaver.dom');

/**
 * A column within a grid
 *
 * @constructor
 * @param {!Element} el         HTML element
 * @param {number}   gridHeight The height of the grid that contains this container
 */
treesaver.layout.Container = function(el, gridHeight) {
  /**
   * @type {boolean}
   */
  this.flexible = !treesaver.dom.hasClass(el, 'fixed');

  /**
   * @type {number}
   */
  this.height = el.offsetHeight;

  /**
   * @type {number}
   */
  this.minH = treesaver.dimensions.toPixels(
    treesaver.dimensions.getStyleObject(el).minHeight
  ) || 0;

  /**
   * @type {number}
   */
  this.delta = Math.max(0, gridHeight - this.height);

  var sizesProperty = el.getAttribute('data-sizes');

  /**
   * @type {!Array.<string>}
   */
  this.sizes = sizesProperty ? sizesProperty.split(' ') : [];
}

/**
 * @param {number} gridHeight
 * @return {!treesaver.layout.Container} Returns self for chaining support
 */
treesaver.layout.Container.prototype.stretch = function stretchContainer(gridHeight) {
  if (!this.flexible) {
    return this;
  }

  this.height = Math.max(0, gridHeight - this.delta);

  return this;
};

if (goog.DEBUG) {
  treesaver.layout.Container.prototype.toString = function toString() {
    return "[Container " + this.height + '/' + this.delta + "]";
  };
}
