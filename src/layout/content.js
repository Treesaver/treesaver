/**
 * @fileoverview The Content class.
 */

goog.provide('treesaver.layout.Content');

goog.require('treesaver.css');
goog.require('treesaver.debug');
goog.require('treesaver.dimensions');
goog.require('treesaver.dom');
goog.require('treesaver.layout.Block');

goog.scope(function() {
  var css = treesaver.css,
      debug = treesaver.debug,
      dimensions = treesaver.dimensions,
      dom = treesaver.dom,
      Block = treesaver.layout.Block;

  /**
   * A chunk of content
   *
   * @constructor
   * @param {!Element} el HTML node which contains all content.
   * @param {!treesaver.ui.Document} doc The parent document that owns this content chunk.
   */
  treesaver.layout.Content = function(el, doc) {
    var indices = {
      index: 0,
      figureIndex: 0
    };

    // TODO: More intelligent back-up value
    this.lineHeight =
      Math.ceil(dimensions.toPixels(el, css.getStyleObject(el).lineHeight) || 1);

    this.colWidth = dimensions.getOffsetWidth(el);

    // In order to properly measure the dimensions of all the content,
    // we need to hide all figures to prevent them from being laid out
    // This causes no harm, since the actual <figure> element is always
    // stripped out of the content
    // TODO: Even without doing harm, this is a silly hack and it'd be
    // better to find a good way to deal with this situation.
    dom.querySelectorAll('figure', el).forEach(function(figure) {
      figure.style.display = 'none';
    });

    // Before we go through and construct our data objects, it really
    // pays off to sanitize all the content, correcting for invalid
    // line height, margins, etc, etc
    // Note that this modifies the tree in place
    Block.sanitizeNode(el, this.lineHeight);

    this.figures = [];
    this.blocks = [];

    this.doc = doc;

    // Now we're ready to create our objects, re-use the processChildren
    // function because it does exactly what we need
    Block.processChildren(this, el, this.lineHeight, indices);
  };

  /**
   * Base line height used throughout the article
   *
   * @type {number}
   */
  treesaver.layout.Content.prototype.lineHeight;

  /**
   * The column width at which this content was measured
   *
   * @type {number}
   */
  treesaver.layout.Content.prototype.colWidth;

  /**
   * @type {Array.<treesaver.layout.Figure>}
   */
  treesaver.layout.Content.prototype.figures;

  /**
   * @type {Array.<treesaver.layout.Block>}
   */
  treesaver.layout.Content.prototype.blocks;

  /**
   * @type {!treesaver.ui.Document}
   */
  treesaver.layout.Content.prototype.doc;

  if (goog.DEBUG) {
    treesaver.layout.Content.prototype.toString = function() {
      return '[Content]';
    };
  }
});
