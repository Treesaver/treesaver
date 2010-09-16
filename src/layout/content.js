/**
 * @fileoverview The Content class
 */

goog.provide('treesaver.layout.Content');

goog.require('treesaver.debug');
goog.require('treesaver.dimensions');
goog.require('treesaver.dom');
goog.require('treesaver.layout.Block');

/**
 * A chunk of content
 *
 * @constructor
 * @param {!Element} el HTML node
 */
treesaver.layout.Content = function(el) {
  var indices = {
    index: 0,
    figureIndex: 0
  };

  /**
   * Base line height used throughout the article
   * TODO: More intelligent back-up value
   *
   * @type {number}
   */
  this.lineHeight = treesaver.dimensions.toPixels(
    treesaver.dimensions.getStyleObject(el).lineHeight
  ) || 1;

  /**
   * The column width at which this content was measured
   *
   * @type {number}
   */
  this.colWidth = el.parentNode.offsetWidth;

  // Before we go through and construct our data objects, it really
  // pays off to sanitize all the content, correcting for invalid
  // line height, margins, etc, etc
  // Note that this modifies the tree in place
  treesaver.layout.Block.sanitizeNode(el, this.lineHeight);

  /**
   * @type {Array.<treesaver.layout.Figure>}
   */
  this.figures = [];

  /**
   * @type {Array.<treesaver.layout.Block>}
   */
  this.blocks = [];

  // Now we're ready to create our objects, re-use the processChildren
  // function because it does exactly what we need
  treesaver.layout.Block.processChildren(this, el, this.lineHeight, indices);

  /**
   * Dictionary of fields and values that can be populated
   * in a grid
   * @type {Object.<string, string>}
   */
  this.fields = {};

  // TODO: Real microdata implementation
  treesaver.dom.$('*[itemprop]', el).forEach(function(dataNode) {
    var propname = (dataNode.getAttribute('itemprop') || '').toLowerCase();

    if (propname) {
      // TODO: Use src for img?
      this.fields[propname] = dataNode.innerText || dataNode.textContent;
    }

    // Debug-only messages
    if (propname) {
      treesaver.debug.info('Field found -- ' + propname + ': ' + this.fields[propname]);
    }
    else {
      treesaver.debug.error('Data field without itemprop name: ' + dataNode);
    }
  }, this);
}

if (goog.DEBUG) {
  treesaver.layout.Content.prototype.toString = function() {
    return "[Content]";
  };
}
