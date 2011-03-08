/**
 * @fileoverview The Content class.
 */

goog.provide('treesaver.layout.Content');

goog.require('treesaver.css');
goog.require('treesaver.debug');
goog.require('treesaver.dimensions');
goog.require('treesaver.dom');
goog.require('treesaver.layout.Block');

/**
 * A chunk of content
 *
 * @constructor
 * @param {!Element} el HTML node which contains all content.
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
  this.lineHeight = treesaver.dimensions.toPixels(el,
    treesaver.css.getStyleObject(el).lineHeight
  ) || 1;

  /**
   * The column width at which this content was measured
   *
   * @type {number}
   */
  this.colWidth = el.offsetWidth;

  // In order to properly measure the dimensions of all the content,
  // we need to hide all figures to prevent them from being laid out
  // This causes no harm, since the actual <figure> element is always
  // stripped out of the content
  // TODO: Even without doing harm, this is a silly hack and it'd be
  // better to find a good way to deal with this situation.
  treesaver.dom.getElementsByTagName('figure', el).forEach(function(figure) {
    figure.style.display = 'none';
  });

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

  // Extract the microdata items and normalize them (i.e. pick the last item
  // of each itemprop and pull properties up to the global field object.)
  treesaver.microdata.getJSONItems(null, el).forEach(function(item) {
    var scope = treesaver.microdata.normalizeItem(item),
        keys = Object.keys(scope);

    keys.forEach(function(key) {
      if (!this.fields[key]) {
        this.fields[key] = scope[key];
        treesaver.debug.info('Field found --- ' + key + ': ' + scope[key].toString());
      }
    }, this);
  }, this);
};

if (goog.DEBUG) {
  treesaver.layout.Content.prototype.toString = function() {
    return '[Content]';
  };
}
