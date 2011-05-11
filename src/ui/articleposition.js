goog.provide('treesaver.ui.ArticlePosition');

treesaver.ui.ArticlePosition = function (index, anchor) {
  this.index = index;
  this.anchor = anchor;
};

treesaver.ui.ArticlePosition.END = new treesaver.ui.ArticlePosition(Infinity);
treesaver.ui.ArticlePosition.BEGINNING = new treesaver.ui.ArticlePosition(0);

treesaver.ui.ArticlePosition.prototype.atBeginning = function () {
  return this.index === 0;
};

treesaver.ui.ArticlePosition.prototype.atEnding = function () {
  return this.index === Infinity;
};

treesaver.ui.ArticlePosition.prototype.isAnchor = function () {
  return !!this.anchor;
};

treesaver.ui.ArticlePosition.prototype.equals = function (other) {
  return this.index === other.index;
};
