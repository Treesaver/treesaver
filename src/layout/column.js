/**
 * @fileoverview Column data structure
 */

goog.provide('treesaver.layout.Column');

goog.require('treesaver.dimensions');
goog.require('treesaver.dom');

/**
 * A column within a grid
 *
 * @constructor
 * @param {!Element} el         HTML element
 * @param {number}   gridHeight The height of the grid that contains this column
 */
treesaver.layout.Column = function(el, gridHeight) {
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
}

/**
 * @param {number} gridHeight
 * @return {!treesaver.layout.Column} Returns self for chaining support
 */
treesaver.layout.Column.prototype.stretch = function stretchColumn(gridHeight) {
  if (!this.flexible) {
    return this;
  }

  this.height = Math.max(0, gridHeight - this.delta);

  return this;
};

if (goog.DEBUG) {
  treesaver.layout.Column.prototype.toString = function toString() {
    return "[Column " + this.height + '/' + this.delta + "]";
  };
}
