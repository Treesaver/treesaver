goog.provide('treesaver.ui.ArticlePosition');

/**
 * Representation of the position of an article within a document.
 * @constructor
 * @param {!number} index The index of the article, or fallback in case anchor is specified.
 * @param {string=} anchor Identifier by which an article can be referenced. If not used, or not found, index is used.
 */
treesaver.ui.ArticlePosition = function (index, anchor) {
  this.index = index;
  this.anchor = anchor;
};

/** @type {number} */
treesaver.ui.ArticlePosition.prototype.index;

/** @type {string|undefined} */
treesaver.ui.ArticlePosition.prototype.anchor;

/**
 * Position at the end of a document
 *
 * @const
 * @type {!treesaver.ui.ArticlePosition}
 */
treesaver.ui.ArticlePosition.END = new treesaver.ui.ArticlePosition(Infinity);

/**
 * Position at the beginning of a document
 *
 * @const
 * @type {!treesaver.ui.ArticlePosition}
 */
treesaver.ui.ArticlePosition.BEGINNING = new treesaver.ui.ArticlePosition(0);

/**
 * Returns true if the position is at the beginning of a document.
 * @return {!boolean}
 */
treesaver.ui.ArticlePosition.prototype.atBeginning = function () {
  return this.index === 0;
};

/**
 * Returns true if the position is at the end of a document.
 * @return {!boolean}
 */
treesaver.ui.ArticlePosition.prototype.atEnding = function () {
  return this.index === Infinity;
};

/**
 * Returns true if this instance represents an anchor.
 * @return {!boolean}
 */
treesaver.ui.ArticlePosition.prototype.isAnchor = function () {
  return !!this.anchor;
};

/**
 * Compares two article positions. Only compares the article indices, not their anchors.
 * @return {!boolean}
 */
treesaver.ui.ArticlePosition.prototype.equals = function (other) {
  return this.index === other.index;
};
