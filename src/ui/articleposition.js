goog.provide('treesaver.ui.ArticlePosition');

/**
 * Representation of the position of an article within a document.
 * @constructor
 * @param {!number} index The index of the article, or fallback in case anchor is specified.
 * @param {string=} anchor Identifier by which an article can be referenced. If not used, or not found, index is used.
 */
treesaver.ui.ArticlePosition = function(index, anchor) {
  this.index = index;
  this.anchor = anchor;
};

goog.scope(function() {
  var ArticlePosition = treesaver.ui.ArticlePosition;

  /** @type {number} */
  ArticlePosition.prototype.index;

  /** @type {string|undefined} */
  ArticlePosition.prototype.anchor;

  /**
   * Position at the end of a document
   *
   * @const
   * @type {!treesaver.ui.ArticlePosition}
   */
  ArticlePosition.END = new ArticlePosition(Infinity);

  /**
   * Position at the beginning of a document
   *
   * @const
   * @type {!treesaver.ui.ArticlePosition}
   */
  ArticlePosition.BEGINNING = new ArticlePosition(0);

  /**
   * Returns true if the position is at the beginning of a document.
   * @return {!boolean}
   */
  ArticlePosition.prototype.atBeginning = function() {
    return this.index === 0;
  };

  /**
   * Returns true if the position is at the end of a document.
   * @return {!boolean}
   */
  ArticlePosition.prototype.atEnding = function() {
    return this.index === Infinity;
  };

  /**
   * Returns true if this instance represents an anchor.
   * @return {!boolean}
   */
  ArticlePosition.prototype.isAnchor = function() {
    return !!this.anchor;
  };

  /**
   * Compares two article positions. Only compares the article indices, not their anchors.
   * @return {!boolean}
   */
  ArticlePosition.prototype.equals = function(other) {
    return this.index === other.index;
  };
});
