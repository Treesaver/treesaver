/**
 * @fileoverview BreakRecord class.
 */

goog.provide('treesaver.layout.BreakRecord');

goog.require('treesaver.array');
goog.require('treesaver.layout.ContentPosition');

/**
 * BreakRecord class
 * @constructor
 */
treesaver.layout.BreakRecord = function() {
  this.index = 0;
  this.figureIndex = 0;
  this.overhang = 0;
  this.delayed = [];
  this.failed = [];
  this.pageNumber = 0;
};

goog.scope(function() {
  var BreakRecord = treesaver.layout.BreakRecord,
      ContentPosition = treesaver.layout.ContentPosition,
      array = treesaver.array;

  /**
   * @type {number}
   */
  BreakRecord.prototype.index;

  /**
   * @type {number}
   */
  BreakRecord.prototype.figureIndex;

  /**
   * @type {number}
   */
  BreakRecord.prototype.overhang;

  /**
   * @type {boolean}
   */
  BreakRecord.prototype.finished;

  /**
   * @type {Array.<number>}
   */
  BreakRecord.prototype.delayed;

  /**
   * @type {Array.<number>}
   */
  BreakRecord.prototype.failed;

  /**
   * @type {number}
   */
  BreakRecord.prototype.pageNumber;

  /**
   * Create a new copy, and return
   *
   * @return {!treesaver.layout.BreakRecord} A deep clone of the original breakRecord.
   */
  BreakRecord.prototype.clone = function() {
    var clone = new this.constructor();
    clone.index = this.index;
    clone.figureIndex = this.figureIndex;
    clone.overhang = this.overhang;
    clone.finished = this.finished;
    clone.delayed = this.delayed.slice(0);
    clone.failed = this.failed.slice(0);
    clone.pageNumber = this.pageNumber;

    return clone;
  };

  /**
   * Check for effective equality
   *
   * @param {treesaver.layout.BreakRecord} other Object to check for equality.
   * @return {boolean} True if the breakRecord is equivalent.
   */
  BreakRecord.prototype.equals = function(other) {
    return !!other &&
        other.index === this.index &&
        other.figureIndex === this.figureIndex &&
        other.overhang === this.overhang &&
        // TODO: Better detection?
        // For now this works, since it's not possible to advance
        // pagination and have these be true
        other.delayed.length === this.delayed.length;
  };

  /**
   * Return a new object which can be used as a marker for
   * the position in the content
   *
   * @return {!treesaver.layout.ContentPosition}
   */
  BreakRecord.prototype.getPosition = function() {
    return new ContentPosition(this.index, this.figureIndex, this.overhang);
  };

  /**
   * Is the break record at the beginning of content?
   *
   * @return {boolean} True if this breakRecord is at the start
   *                   of content.
   */
  BreakRecord.prototype.atStart = function() {
    return !this.index && !this.figureIndex && !this.overhang;
  };

  /**
   * Is the break record at the end of the content?
   *
   * @param {!treesaver.layout.Content} content The content for this breakRecord.
   * @return {boolean} True if there is no more content left to show.
   */
  BreakRecord.prototype.atEnd = function(content) {
    if (this.overhang) {
      // Overhang means we're not finished, no matter what
      return false;
    }

    var i = this.index,
		len = content.blocks.length,
		nextNonChild,
		figure, delayed, block;

    // Check if there are any blocks left to layout, not including
    // fallbacks for optional (or used) figures
    while (i < len) {
      block = content.blocks[i];
      nextNonChild = block.getNextNonChildBlock();

      if (!block.isFallback) {
        // We have a non-fallback block left, which means we are not done
        return false;
      }

      if (!this.figureUsed(block.figure.figureIndex) && !block.figure.optional) {
        // Have the unused fallback of a required figure, we are not done
        return false;
      }

	  i = nextNonChild ? nextNonChild.index : len;
    }

    // No blocks left, check figures

    // If we've used all the figures, then we're done
    if (!this.delayed.length &&
        this.figureIndex === content.figures.length) {
      return true;
    }

    // We have some figures left, gotta figure out if any of them are
    // required
    delayed = this.delayed.slice(0);

    // First, check the delayed figures
    while (delayed.length) {
      figure = content.figures[delayed.pop()];
      // A required figure means we're not done yet
      if (!figure.optional) {
        return false;
      }
    }

    // Now check the remaining figures
    for (i = this.figureIndex, len = content.figures.length; i < len; i += 1) {
      figure = content.figures[i];
      // A required figure means we're not done yet
      if (!figure.optional) {
        return false;
      }
    }

    // If we made it this far, then we are done!
    return true;
  };

  /**
   * Update the breakRecord after using a figure. Make sure to update
   * delayed array, etc
   *
   * @param {!number} figureIndex The index of the figure just used.
   */
  BreakRecord.prototype.useFigure = function(figureIndex) {
    var delayedIndex;

    if (figureIndex < 0) {
      treesaver.debug.error('Negative number passed to useFigure');
    }

    // If the index used it less than our current marker, then it
    // was probably delayed (no guarantee though)
    if (figureIndex < this.figureIndex) {
      if ((delayedIndex = this.delayed.indexOf(figureIndex)) !== -1) {
        // Remove from delayed
        array.remove(this.delayed, delayedIndex);
      }
      else if ((delayedIndex = this.failed.indexOf(figureIndex)) !== -1) {
        // Was a failure, remove
        array.remove(this.failed, delayedIndex);
      }
      else {
        // Do nothing
      }
    }
    else {
      // Otherwise, we need to move up our high-water mark of figureIndex,
      // adding any skipped indicies to the delayed array
      if (figureIndex > this.figureIndex) {
        for (; this.figureIndex < figureIndex; this.figureIndex += 1) {
          this.delayed.push(this.figureIndex);
        }
      }

      // Now that delayed array is updated, we can advance
      this.figureIndex = figureIndex + 1;
    }
  };

  /**
   * Update the break record in order to delay a figure
   *
   * @param {!number} figureIndex
   */
  BreakRecord.prototype.delayFigure = function(figureIndex) {
    if (this.delayed.indexOf(figureIndex) === -1) {
      // Pretend the figure was used
      this.useFigure(figureIndex);

      // But move it into the delayed array
      this.delayed.push(figureIndex);
    }
  };

  /**
   * Check if the given figure index has been used
   *
   * @param {!number} figureIndex
   * @return {boolean} True if the figure index has been used.
   */
  BreakRecord.prototype.figureUsed = function(figureIndex) {
    if (this.figureIndex <= figureIndex) {
      return false;
    }

    if (this.delayed.indexOf(figureIndex) !== -1) {
      return false;
    }

    if (this.failed.indexOf(figureIndex) !== -1) {
      return false;
    }

    return true;
  };

  /**
   * Update the breakRecord after trying to use a figure, but failing.
   *
   * @param {!number} figureIndex The index of the figure just used.
   */
  BreakRecord.prototype.failedFigure = function(figureIndex) {
    // Pretend like we used the figure
    this.useFigure(figureIndex);

    // Now move the figure to the failed array
    this.failed.push(figureIndex);
  };

  if (goog.DEBUG) {
    BreakRecord.prototype.toString = function() {
      return '[BreakRecord ' + this.index + '/' + this.figureIndex + ']';
    };
  }
});
