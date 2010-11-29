/**
 * @fileoverview Column data structure.
 */

goog.provide('treesaver.layout.Column');

goog.require('treesaver.dimensions');
goog.require('treesaver.dom');

/**
 * A column within a grid
 *
 * @constructor
 * @param {!Element} el         HTML element.
 * @param {number}   gridHeight The height of the grid that contains this column.
 */
treesaver.layout.Column = function(el, gridHeight) {
  var d = new treesaver.dimensions.Metrics(el);

  /**
   * @type {boolean}
   */
  this.flexible = !treesaver.dom.hasClass(el, 'fixed');

  /**
   * @type {number}
   */
  this.minH = d.minH;

  // Need to clear the minHeight, if there is one, in order to get an accurate
  // delta reading
  if (this.minH) {
    treesaver.dimensions.setCssPx(el, 'minHeight', 0);
  }

  /**
   * @type {number}
   */
  this.h = d.outerH;

  /**
   * @type {number}
   */
  this.delta = Math.max(0, gridHeight - this.h);
};

/**
 * @param {number} gridHeight
 * @return {!treesaver.layout.Column} Returns self for chaining support.
 */
treesaver.layout.Column.prototype.stretch = function stretchColumn(gridHeight) {
  if (!this.flexible) {
    return this;
  }

  this.h = Math.max(0, gridHeight - this.delta);

  return this;
};

if (goog.DEBUG) {
  treesaver.layout.Column.prototype.toString = function toString() {
    return '[Column ' + this.h + '/' + this.delta + ']';
  };
}
