/**
 * @fileoverview Column data structure.
 */

goog.provide('treesaver.layout.Column');

goog.require('treesaver.dimensions');
goog.require('treesaver.dom');

goog.scope(function() {
  var dimensions = treesaver.dimensions,
      dom = treesaver.dom;

  /**
   * A column within a grid
   *
   * @constructor
   * @param {!Element} el         HTML element.
   * @param {number}   gridHeight The height of the grid that contains this column.
   */
  treesaver.layout.Column = function(el, gridHeight) {
    var d = new dimensions.Metrics(el);

    this.flexible = !dom.hasClass(el, 'fixed');

    this.minH = d.minH;

    // Need to clear the minHeight, if there is one, in order to get an accurate
    // delta reading
    if (this.minH) {
      dimensions.setCssPx(el, 'minHeight', 0);
    }

    this.h = d.outerH;
    this.w = d.outerW;

    this.delta = Math.max(0, gridHeight - this.h);
  };
});

goog.scope(function() {
  var Column = treesaver.layout.Column;

  /**
   * @type {boolean}
   */
  Column.prototype.flexible;

  /**
   * @type {number}
   */
  Column.prototype.minH;

  /**
   * @type {number}
   */
  Column.prototype.h;

  /**
   * @type {number}
   */
  Column.prototype.delta;

  /**
   * @param {number} gridHeight
   * @return {!treesaver.layout.Column} Returns self for chaining support.
   */
  Column.prototype.stretch = function(gridHeight) {
    if (!this.flexible) {
      return this;
    }

    this.h = Math.max(0, gridHeight - this.delta);

    return this;
  };

  if (goog.DEBUG) {
    Column.prototype.toString = function() {
      return '[Column ' + this.h + '/' + this.delta + ']';
    };
  }
});
