goog.provide('treesaver.layout.Page');

goog.require('treesaver.capabilities');
goog.require('treesaver.debug');
goog.require('treesaver.dimensions');
goog.require('treesaver.dom');
goog.require('treesaver.template');
goog.require('treesaver.layout.Grid');
goog.require('treesaver.ui.Scrollable');

goog.scope(function() {
  var capabilities = treesaver.capabilities,
      debug = treesaver.debug,
      dimensions = treesaver.dimensions,
      dom = treesaver.dom,
      Grid = treesaver.layout.Grid;

  /**
   * Page class
   * @constructor
   * @param {!treesaver.layout.Content} content
   * @param {!Array.<treesaver.layout.Grid>} grids
   * @param {!treesaver.layout.BreakRecord} br The current breakRecord.
   *  @param {!Array.<string>} extra_classes Extra classes to apply.
   */
  treesaver.layout.Page = function(content, grids, br, extra_classes) {
    var best = Grid.best(content, grids, br),
        host = document.createElement('div'),
        originalBr = br.clone(),
        containerFilled = false;

    if (!best || !best.grid) {
      // Might have leftover figures that just won't fit
      br.finished = br.atEnd(content) ||
      br.figureIndex === content.figures.length;

      if (br.finished) {
        debug.info('Finished article in face of error.');
        this.ignore = true;
      }
      else {
        debug.error('No best grid found: ' + arguments);
        this.error = true;
      }

      return;
    }

    // Store state
    this.size = best.grid.stretchedSize.clone();
    this.begin = br.getPosition();

    // Create our host for measuring and producing HTML
    dom.addClass(host, 'offscreen');
    // TODO: Only add to body if needed?
    // TODO: Perhaps not, since IE has innerHTML issues when disconnected
    document.body.appendChild(host);
    host.innerHTML = best.grid.html;
    host.firstChild.className += ' ' + extra_classes.join(' ');
    this.node = /** @type {!Element} */ (host.firstChild);

    // Manually set dimensions on the page
    dimensions.setCssPx(this.node, 'width', this.size.w);
    dimensions.setCssPx(this.node, 'height', this.size.h);

    dom.querySelectorAll(
      '[' + dom.customAttributePrefix + 'template=document]',
      this.node
    ).forEach(function(el) {
      treesaver.template.expand(el, el.innerHTML, content.doc.meta);
    });

    // Containers
    dom.querySelectorAll('.container', this.node).forEach(function(containerNode, i) {
      var mapping = best.containers[i],
          figure, figureIndex, success;

      if (mapping) {
        figureIndex = mapping.figureIndex;
        figure = /** @type {!treesaver.layout.Figure} */ (content.figures[figureIndex]);
        success = treesaver.layout.Page.fillContainer(containerNode, figure, mapping,
          content.lineHeight);

        // Account for the figure we used
        if (success) {
          br.useFigure(figureIndex);
          containerFilled = true;

          // Need to store some extra data when supporting zoom
          if (figure.zoomable) {
            dom.addClass(containerNode, 'zoomable');
            containerNode.setAttribute('data-figureindex', figureIndex);
            if (capabilities.IS_NATIVE_APP || capabilities.SUPPORTS_TOUCH) {
              // Need dummy handler in order to get bubbled events
              containerNode.setAttribute('onclick', 'void(0)');
            }
          }

          // Size to the container
          if (i === 0 && best.grid.scoringFlags['sizetocontainer']) {
            this.size.h = dimensions.getOffsetHeight(containerNode) +
              best.grid.containers[0].delta;
            this.size.outerH = this.size.h + this.size.bpHeight;
            dimensions.setCssPx(/** @type {!Element} */ (this.node), 'height', this.size.h);
          }
        }
        else {
          debug.info('Container failure, figureIndex: ' + figureIndex);

          // TODO: Note more info about failure? E.g. target size and actual size, etc
          if (!figure.optional && figure.fallback) {
            // Required figures with fallbacks must be preserved, delay instead of
            // failing
            // TODO: How to make sure we don't continually re-try the delayed figure?
            br.delayFigure(figure.figureIndex);
          }
          else {
            // Don't mark the figure as failed if the container was reduced in size
            if (!dom.hasClass(containerNode, 'flexed')) {
              br.failedFigure(figureIndex);
            }
          }

          // Remove node for easier styling
          containerNode.parentNode.removeChild(containerNode);
        }
      }
      else {
        // No node, remove
        containerNode.parentNode.removeChild(containerNode);
      }
    }, this);

    // Columns
    dom.querySelectorAll('.column', this.node).forEach(function(colNode, i) {
      var col = best.grid.cols[i];
      treesaver.layout.Page.fillColumn(content, br, colNode,
        best.grid.maxColHeight, col.minH);
    });

    // Check if there was forward progress made
    if (originalBr.equals(br)) {
      debug.error('No progress made in pagination: ' + arguments + best);
      this.error = true;
    }
    else if (!containerFilled && best.grid.scoringFlags['sizetocontainer']) {
      debug.warn('sizetocontainer not filled, page ignored');
      // Couldn't fill the container, ignore this page
      this.ignore = true;
    }
    else {
      // Centers the page vertically & horizontally with less work for us
      dimensions.setCssPx(this.node, 'marginTop', -this.size.outerH / 2);
      dimensions.setCssPx(this.node, 'marginLeft', -this.size.outerW / 2);

      // Are we finished?
      br.finished = best.grid.scoringFlags['onlypage'] || br.atEnd(content);

      // Add last page flag if complete
      if (br.finished) {
        dom.addClass(this.node, 'last-page');
      }

      this.html = host.innerHTML;
      this.end = br.getPosition();

      // Increment page number
      br.pageNumber += 1;
    }

    // Cleanup
    this.deactivate();
    document.body.removeChild(host);
  };
});

goog.scope(function() {
  var Page = treesaver.layout.Page,
      debug = treesaver.debug,
      dimensions = treesaver.dimensions,
      dom = treesaver.dom,
      Scrollable = treesaver.ui.Scrollable;

  /**
   * @type {boolean}
   */
  Page.prototype.ignore;

  /**
   * @type {!treesaver.dimensions.Metrics}
   */
  Page.prototype.size;

  /**
   * @type {!treesaver.layout.ContentPosition}
   */
  Page.prototype.begin;

  /**
   * @type {?Element}
   */
  Page.prototype.node;

  /**
   * @type {string}
   */
  Page.prototype.html;

  /**
   * @type {!treesaver.layout.ContentPosition}
   */
  Page.prototype.end;

  /**
   * @type {boolean}
   */
  Page.prototype.active;

  /**
   * @param {!Element} container
   * @param {!treesaver.layout.Figure} figure
   * @param {!treesaver.layout.Grid.ContainerMap} map
   * @param {?number} lineHeight
   * @return {boolean} True if the figure fit within the container.
   */
  Page.fillContainer = function(container, figure, map,
      lineHeight) {
    var size, figureSize,
        containerHeight, sibling,
        metrics,
        maxContainerHeight,
        anchoredTop = true;

    size = map.size;
    figureSize = map.figureSize;

    if (goog.DEBUG) {
      if (!size) {
        debug.error('Empty size!');
      }

      if (!figureSize) {
        debug.error('Empty figureSize!');
      }
    }

    maxContainerHeight = dimensions.getOffsetHeight(container);

    // Do any content switching that needs to happen
    figureSize.applySize(container, size);

    // If the container is fixed, then we are done no matter what
    if (!map.flexible) {
      return true;
    }

    // Adjust flexible containers

    // Unhinge from a side before measuring
    if (dom.hasClass(container, 'bottom')) {
      anchoredTop = false;
      container.style.top = 'auto';
    }
    else {
      container.style.bottom = 'auto';
    }

    // TODO: Query only needed properties
    metrics = new dimensions.Metrics(container);
    containerHeight = metrics.outerH;

    // Did not fit :(
    // TODO: Use something better than parent height
    if (containerHeight > maxContainerHeight) {
      // Make an exception for scrollable figures
      if (figure.scrollable) {
        // Occupy the entire space, and let the excess scroll
        containerHeight = maxContainerHeight;

        // Fix the height (prevents overflow in case of mis-measuring)
        dimensions.setCssPx(container, 'height', containerHeight - metrics.bpHeight);
      }
      else {
        // Not scrollable, can't be displayed
        debug.info('Container failure: ' + containerHeight + ':' + maxContainerHeight);

        if (goog.DEBUG) {
          container.setAttribute('data-containerHeight', containerHeight);
          container.setAttribute('data-maxHeight', maxContainerHeight);
          container.setAttribute('data-attemptedSize', size);
        }

        // Revert after failure
        figureSize.revertSize(container, size);

        // TODO: Return style.bottom & style.top to originals?

        return false;
      }
    }
    else {
      // Round to nearest for column adjustment to maintain grid
      if (lineHeight && containerHeight % lineHeight) {
        containerHeight = dimensions.roundUp(containerHeight, lineHeight);
      }
    }

    if (figure.scrollable) {
      // Make the container scroll
      dom.addClass(container, 'scroll');
      Scrollable.initDom(container);
    }

    // Go through this containers siblings, adjusting their sizes
    sibling = container;
    while ((sibling = sibling.nextSibling)) {
      if (sibling.nodeType !== 1) {
        // Ignore non-elements
        continue;
      }

      // Cast for compiler
      sibling = /** @type {!Element} */ (sibling);

      // Don't touch fixed items
      if (dom.hasClass(sibling, 'fixed')) {
        continue;
      }

      if (dom.hasClass(sibling, 'column') ||
          dom.hasClass(sibling, 'container') ||
          dom.hasClass(sibling, 'group')) {
        // Add a flag for debugging / later detection
        dom.addClass(sibling, 'flexed');

        // Make sure we don't go negative
        if (dimensions.getOffsetHeight(sibling) <= containerHeight) {
          debug.info('Sibling shrunk to zero height: ' + sibling);
          // TODO: Remove from tree?
          dimensions.setCssPx(sibling, 'height', 0);
        }
        else {
          // Since items are always absolutely positioned, we can
          // adjust the position of the column directly based on it's
          // offsets
          if (anchoredTop) {
            dimensions.setCssPx(sibling, 'top',
              dimensions.getOffsetTop(sibling) + containerHeight);
          }
          else {
            // Compute the current 'bottom' value by using the parent's offsetHeight
            dimensions.setCssPx(sibling, 'bottom',
              dimensions.getOffsetHeight(sibling.offsetParent) -
              (dimensions.getOffsetTop(sibling) + dimensions.getOffsetHeight(sibling)) + containerHeight);
          }
        }
      }
    }

    return true;
  };

  /**
   * @param {!treesaver.layout.Content} content
   * @param {!treesaver.layout.BreakRecord} br
   * @param {!Element} node
   * @param {number} maxColHeight
   * @param {number} minH Minimum height of the column.
   */
  Page.fillColumn = function(content, br, node, maxColHeight, minH) {
    var colHeight = dimensions.getOffsetHeight(node),
        height = 0,
        remainingHeight,
        firstBlock,
        isFirstBlock = true,
        initMarginTop = 0,
        marginAndFirstLine = 0,
        marginTop = 0,
        marginBottom = 0,
        blockStrings = [],
        blockCount = content.blocks.length,
        block = content.blocks[br.index],
        nextSibling,
        nextNonChild,
        nextNotUsed,
        parent, closeTags = [],
        effectiveBlockHeight,
        finishColumn = false,
        // Dumb heuristic for indicating whether this is a "short" column
        // TODO: Any special logic with flexed columns?
        shortColumn = (maxColHeight / colHeight) > 1.5;

    // Is there any content left?
    if (!block) {
      // TODO: Remove column element altogether?
      return;
    }

    // TODO: Is this right?
    // Make sure colHeight is on our verticl grid
    if (colHeight % content.lineHeight) {
      colHeight -= colHeight % content.lineHeight;
    }

    // Can we fit any content within this column?
    if (!colHeight || colHeight < minH) {
      debug.info('Column below minHeight: ' + block + ':' + colHeight);

      // No height, we are done here
      // TODO: Remove column element altogether?
      return;
    }

    // Open HTML from tag stack
    if (block.parent) {
      blockStrings.push(block.openAllTags(true));
    }

    // Calculate the margin we'll use in the first block of this column
    // If there's an overhang, we use a negative margin to deduct the part
    // of the block that was shown in the previous column (or page)
    // If there's no overhang, then we use zero margin due to collapsing rules
    initMarginTop = br.overhang ? block.metrics.outerH - br.overhang : 0;

    // This is by far the most complex portion of the code here, so be very
    // careful when altering it.
    //
    // The concept is very simple, we place as many blocks as we can fit into
    // this column, then exit.
    //
    // However, things get complex, because there are many scenarios in which
    // a block may or may not fit
    block_loop:
    while (br.index < blockCount && height < colHeight) {
      block = content.blocks[br.index];
      nextSibling = block.nextSibling;
      nextNonChild = nextSibling || block.getNextNonChildBlock();
      nextNotUsed = nextSibling && Page.nextNotUsedBlock(content, br, nextSibling, blockCount);

      // First, we must check if this block is a figure's fallback content.
      // If so, then we must see if the figure has been used
      // Note: A fallback block could have overhang from previous column,
      // so must check for that as well
      if (block.isFallback && br.figureUsed(block.figure.figureIndex) &&
          !(isFirstBlock && br.overhang)) {
        // The figure has been used, so we can't use this block at all
        //
        // If the block was the last element in it's nesting level, then we need
        // to close the parent block
        // TODO: Back it out completely
        if (block.parent && !block.nextSibling) {
          // TODO: Close out tags by looping up parents
          debug.error('Must close out parent tags on unused fallback!');
        }

        // Go to the next block, skipping any children of this block
        br.index = nextNonChild ? nextNonChild.index : blockCount;
        // Move on to the next block
        continue block_loop;
      }


      parent = block.parent;
      remainingHeight = colHeight - height;

      // Calculate some of the metrics we'll be using for this block. These vary
      // depending on where we are in the column and content.
      //
      // Check for an existing marginTop, which is a sign that we already opened
      // a tag
      if (isFirstBlock && !marginTop) {
        // The first block will need to account for any overhang, and
        // never has any top margin due to collapsing rules (all calculated
        // outside the block_loop)
        marginTop = -initMarginTop;
        // If we're overflowed, then we're already mid-way through the content
        // and the "first line" is really the "next line" -- which we know via
        // lineHeight. Otherwise, use the pre-computed firstLine property
        marginAndFirstLine = br.overflow ?
          block.metrics.lineHeight : block.firstLine;
      }
      else {
        // Collapse with previous margin
        marginTop = Math.max(marginTop, block.metrics.marginTop);
        marginAndFirstLine = marginTop + block.firstLine;
      }

      // Collapse the bottom margin with our next sibling, if there is one
      // TODO: What if this is the last child of a block?
      marginBottom = Math.max(block.metrics.marginBottom,
          nextNotUsed ? nextNotUsed.metrics.marginTop : 0);

      // The amount of space our block will take up in this column if inserted
      // Height plus whatever our margin ended up being
      //
      // TODO: What if this contains a fallback? We don't actually know how
      // tall it will be :(
      effectiveBlockHeight = block.metrics.outerH + marginTop;

      // Do a quick check and see if we can fit the first line of content in the
      // current block, if we can't (and shouldn't), then we'll exit the loop
      // early
      finishColumn = remainingHeight < marginAndFirstLine;

      // We may be able to fit the first line of the current block, but now we
      // need to check for a keepwithnext with next restriction.
      //
      // Note that keepwithnext is ignored if there is no next sibling, or if the
      // block was already broken (has overhang) -- or if this is the isFirstBlock
      // in a non-short column
      if (!finishColumn && block.keepwithnext && nextNotUsed &&
          !(br.overhang || (isFirstBlock && !shortColumn))) {
        // Keepwithnext means that we must attempt to keep this block in the same
        // column/page as it's next sibling. However, the current block can still
        // break into the next column in order to do so
        //
        // Scenarios:
        //   1) Current and next block's first line fit (all good!)
        //   2) Current only fits partially, which means that it'll likely share
        //      the next column with it's sibling, thus fufilling the requirement
        //   3) Current fits completely, but the first line of the next block 
        //      doesnt -- need to delay current (but only if this isn't a virgin
        //      column) [which we check for later]
        //
        // We are testing solely for scenario 3 here, since we're trying to figure
        // out if we need to end the column early
        finishColumn = (remainingHeight >= effectiveBlockHeight) &&
          (remainingHeight <
            (effectiveBlockHeight + marginBottom + nextNotUsed.firstLine));

        if (finishColumn) {
          debug.info('Leaving column due to keepwithnext');
        }
      }

      if (finishColumn) {
        // We know that we can't cleanly fit the current block into the column
        // We have no guarantee that the block would fit in the next column,
        // so only break the current column if it's not brand new or happens to be
        // abnormally short (likely due to stretching from a figure)
        //
        // TODO: What if the next column is even shorter? Not very easy to tell
        // since the next column could be on the next page, etc.
        finishColumn = !isFirstBlock || shortColumn;

        if (finishColumn) {
          if (shortColumn) {
            debug.info('Leaving column empty due to being short');
          }
          else if (!isFirstBlock) {
            debug.info('Ending column early due to non-fit');
          }
        }
        else {
          debug.info('Staying in virgin column despite non-fit');
        }
      }

      if (finishColumn) {
        // One final special case is due to fallback elements, which are a real
        // pain in the ass, since we don't know if we can account for them or not
        //
        // Instead of trying to do any fancy logic, we just punt on the entire
        // issue and take the slow route, skipping any early termination of the
        // column when we have a fallback
        finishColumn = !block.containsFallback;
      }

      if (block.columnBreak && !isFirstBlock) {
        // If it's marked as column break, obey the command
        // No matter what, this includes fallbacks
        // TODO: Any issues with this?
        finishColumn = true;
      }

      if (finishColumn) {
        // We cannot fit the current block into the column, need to exit early
        //
        // Check and see if we need to close out any open element tags.
        if (parent) {
          // Now there's at least one unclosed tag sitting on the stack
          //
          // We need to go up the parent chain and either:
          //   1) Close the tag if there are other elements at that nesting level
          //   2) Remove the tag completely so we don't have an empty tag
          //
          // Due to firstLine detection, #2 should be somewhat rare, but it can
          // happen in cases where firstLine is more complicated (keepwithnext,
          // or with fallbacks)
          //
          // We know that an element is the first child of it's parent if their
          // indices are off by one.
          while (parent && parent.index === block.index - 1) {
            debug.info('Backing out opened tag: ' + parent.openTag);

            // The current tag level has no children, let's remove the string from
            // our stack, and adjust the break record
            blockStrings.pop();
            // TODO: Is there any risk with backing up into the br like this?
            br.index = parent.index;
            // TODO: Is there any reason we should try to update the height here?

            // Check if the parent block was a fallback
            if (parent.isFallback) { // TODO: Remove bool and check parent.fig?
              // We had previously marked the corresponding figure as used, we
              // un-use it by just adding it to the delayed blocks
              //
              // TODO: What if it was failed? We'll be placing it in the
              // wrong array
              br.delayFigure(parent.figure.figureIndex);
            }

            // Move up one level
            block = parent;
            parent = block.parent;
          }

          // If we exited the loop with an active parent, that means we still have
          // some open tags on the stack, close them out now
          if (parent) {
            blockStrings.push(block.closeAllTags());
          }
        }

        // Finish the loop and bust out of this podunk column
        break block_loop;
      }

      // We've made it this far, which means we're definitely going to insert
      // some content into the current column.

      // If we're going to use a fallback, mark the figure as used now so we don't
      // get duplicate content displayed to the user
      if (block.isFallback) {
        br.useFigure(block.figure.figureIndex);
      }

      // Scenarios:
      //   1) Contains a fallback, meaning we don't know it's true height
      //      Must open tag and recurse no matter what
      //   2) Has child blocks, but won't fit completely: Open tag and continue
      //   3) Current block fits completely: Insert and continue
      //   4) Doesn't fit, no children: Insert and overflow
      //
      // Tackle 1 & 2 first, which involve opening up the current parent element
      if (block.containsFallback ||
          (block.blocks.length && remainingHeight < effectiveBlockHeight)) {
        // Should never have an overhang when opening a parent
        if (br.overhang) {
          debug.error('Overhang present when opening a parent block');
        }

        // Note: we are accumulating top margin, so we only add the margin in
        // when we finally insert a block, or when the margin collapsing is broken
        // by Border & Padding
        if (block.metrics.bpTop) {
          // Add the accumulated top margin, and then reset the margin since we're
          // using it up
          height += isFirstBlock ? 0 : marginTop;
          marginTop = 0;

          // Now include the BP itself
          height += block.metrics.bpTop;

          // Note that we shouldn't manually set the isFirstBlock flag here,
          // since we might get stuck as the system keeps on trying to make
          // space by breaking into a new column
        }
        else {
          // No BP = Margin keeps on collapsing
          //
          // Since this is an open tag, it means we don't worry about marginBottom
        }

        // Open the tag
        // Note: There is no need to use the _zero version here, because
        // initMarginTop takes care of the top margin setting. Also, we don't
        // want to zero out BP here
        blockStrings.push(block.openTag);

        // Move to the first child (which is always the next index)
        br.index += 1;

        // Start our loop again
        continue block_loop;
      }

      // Now we're left with:
      //   1) Insert & continue
      //   2) Insert & overflow

      // No matter what, we're inserting the block at this point
      height += effectiveBlockHeight;
      blockStrings.push(block.html);
      // Reset our flags
      isFirstBlock = false;
      firstBlock = firstBlock || block;
      br.overhang = 0;

      // Now check whether the content fits completely, with potential space
      // for the next block (let ties be processed a different fashion, since
      // we'll close out the column that way)
      if (colHeight > height + marginBottom) {
        // The full content portion of this block fits, which means we can
        // advance the breakRecord to the next block
        br.index = nextNonChild ? nextNonChild.index : blockCount;

        // Things get a little more complex now due to nesting and margin
        // collapsing.
        //
        // We need to do the following:
        //   - Close any parent elements that have been finished
        //   - Add any bottom margin / BP
        //   - Properly track margin collapsing

        if (!nextSibling && parent) {
          closeTags = [];
          do {
            // We are the final sibling in a parent container, so let's close
            // out that tag
            closeTags.push(parent.closeTag);
            // Need to figure out margin collapsing.
            // Bottom margin continues to accumulate as long as the parent doesn't
            // have a bpBottom
            if (parent.metrics.bpBottom) {
              // Collapsing is broken so add the accumulated bottom margin and BP
              height += marginBottom + parent.metrics.bpBottom;
              // Start a new margin accumulation
              marginBottom = parent.metrics.marginBottom;
            }
            else {
              // Margin collapsing not broken, accumulate
              marginBottom = Math.max(marginBottom, parent.metrics.marginBottom);
            }
          } while (!parent.nextSibling && ((parent = parent.parent)));

          // Check and see if we're now going to overflow due to excess BP
          if (colHeight > height + marginBottom) {
            // Still have more room to fit content in this column, do our partial
            // closing of tags
            blockStrings.push(closeTags.join(''));
          }
          else {
            // Close out remaining tags.
            if (parent) {
              blockStrings.push(block.closeAllTags());
            }

            // We don't want to try to calculate overhang, since all the overhang
            // is due to closing BP and bottom margins, so just set the colHeight
            // manually to bypass (clipping any excess)
            height = colHeight;

            // Get out off the loop
            break block_loop;
          }
        }

        // Propagate bottom margin (gets collapsed w/ top margin in next loop)
        marginTop = marginBottom;

        // Loop again
        continue block_loop;
      }

      // The content does not fit, we are done with this column and going to
      // overflow. Clean up before we leave

      // Close out any open parent tags
      if (parent) {
        blockStrings.push(block.closeAllTags());
      }

      // We make a special case for unbreakable elements (replaced elements like
      // img, canvas, etc). We don't want to even try to split this across a
      // column or page, so we just shove it in and let it clip
      if (!block.breakable) {
        // Just make the height the full height of the column, since this
        // will bypass any overflow calculation (and realistically look
        // the best by keeping to vertical grid). The excess clips
        height = colHeight;

        // Advance the breakRecord, so we don't repeat the block
        br.index = nextNonChild ? nextNonChild.index : blockCount;

        debug.warn('Unbreakable element shoved into column');
      }
      else {
        // Make sure we don't process as if we have overhang, because
        // we don't (probably got here by having a large margin that
        // extends past the end of the column)
        if (height <= colHeight) {
          br.index = nextNonChild ? nextNonChild.index : blockCount;

          // Make sure we don't try to do overhang
          height = colHeight;
        }

        if (block.keeptogether) {
          debug.warn('keeptogether element shoved into column');
        }

        // Do not advance the break record, since we need to stay on this
        // block for overflow into the next column
      }

      // We are finished with this loop. Calculate overflow on the outside
      break block_loop;
    } // block_loop

    // Do overhang calculation
    colHeight = Page.computeOverhang(br, block, colHeight, height);

    // In DEBUG, sprinkle the dom with hints
    if (goog.DEBUG) {
      node.setAttribute('data-overhang', br.overhang);
      node.setAttribute('data-contentHeight', height);
      if (firstBlock) {
        node.setAttribute('data-firstBlock', firstBlock.index);
      }
      if (block) {
        node.setAttribute('data-lastBlock', block.index);
      }
    }

    // Do a tight fix on the column height
    dimensions.setCssPx(node, 'height', colHeight);

    // Join string array and insert into column node
    node.innerHTML = blockStrings.join("");

    // Apply overhang to the first block
    if (firstBlock && node.firstChild) {
      node.firstChild.style.marginTop = -initMarginTop + 'px';

      if (firstBlock.parent && !initMarginTop) {
        // Check if we need to zero-out margins on the children
        parent = firstBlock.parent;
        while (parent) {
          if (parent.metrics.bpTop) {
            // Has bpTop, so margins don't collapse
            firstBlock = parent;
          }
          parent = parent.parent;
        }

        // TODO: Really think about this code, it's weird

        // Have to traverse in
        if (parent !== firstBlock) {
          parent = firstBlock.parent;
          block = node.firstChild;

          while (parent) {
            block = block.firstChild;
            parent = parent.parent;
            if (block) {
              block.style.marginTop = 0;
            }
            else {
              debug.error('No block on bad code');
            }
          }
        }
      }
      else if (firstBlock.blocks.length && !initMarginTop) {
        block = node.firstChild;
        while (firstBlock) {
          if (firstBlock.blocks.length && block.firstChild) {
            firstBlock = firstBlock.blocks[0];
            block = block.firstChild;
            block.style.marginTop = 0;
          }
          else {
            firstBlock = null;
          }
        }
      }
    }
    else {
      debug.warn('Clearing column contents since no block was added');

      // Clear out column contents, since no block was added
      dom.clearChildren(node);
    }
  };

  /**
   * @param {!treesaver.layout.Content} content
   * @param {!treesaver.layout.BreakRecord} br
   * @param {!treesaver.layout.Block} nextBlock
   * @param {number} blockCount
   */
  Page.nextNotUsedBlock = function(content, br, nextBlock, blockCount) {
    var index,
        block;
    for (index = nextBlock.index; index < blockCount; index++) {
      block = content.blocks[index];
      if (!block.isFallback || !br.figureUsed(block.figure.figureIndex)) {
        return block;
      }
    }
    return null;
  };

  /**
   * Compute overhang
   * @param {!treesaver.layout.BreakRecord} br The lastBlock inserted into the column
   * @param {!treesaver.layout.Block} lastBlock The lastBlock inserted into the column
   * @param {number} colHeight
   * @param {number} height
   * @return {number} The final column height required for this
   */
  Page.computeOverhang = function(br, lastBlock, colHeight, height) {
    var contentOnlyOverhang,
        excess;

    if (colHeight >= height || !lastBlock) {
      br.overhang = 0;
      return colHeight;
    }

    // Some sanity checks
    if (!lastBlock.breakable) {
      // Should never get to this point
      debug.error('Overhang on unbreakable element');
    }
    if (lastBlock.blocks.length) {
      // Should never get to this point
      debug.error('Overhang on element with children');
    }

    // We have some content peaking out from the bottom of the
    // column. Our job now is to find where we can clip this content
    // without creating any visual artifacts
    br.overhang = height - colHeight;

    // Calculate the portion of the block's content that is sticking
    // outside of the column
    contentOnlyOverhang = br.overhang - lastBlock.metrics.bpBottom;

    // What if no actual content is sticking out and it's all border & padding?
    if (contentOnlyOverhang <= 0) {
      br.overhang = 0;
      // Advance to the next block, since there's no content overhanging
      br.index = lastBlock.index + 1;
      // Note: Don't blindly increment br.index, since you'll never know
      // if it was accidently incremented or via loop triggering
    }
    else {
      // Calculate where the line boundaries occur, and figure out if
      // it's in sync with the clip point.
      // Then check to make sure that's a multiple of line height
      excess = (lastBlock.metrics.h - contentOnlyOverhang) %
              lastBlock.metrics.lineHeight;

      // NOTE: Excess can be larger than the entire block in cases
      // where there is a large top border/padding, make sure to Max w/ 0
      if (excess) {
        // Excess is currently the fraction of a line that is sticking
        // out of the column, not fitting completely

        // The portion of the block in the column is out of sync
        // reduce the column height in order to clip the partial line
        colHeight -= excess;

        // Adjust the overhang as well so we flow correctly in the next col
        br.overhang += excess;
      }
    }

    return colHeight;
  };

  /**
   * Initialize page as necessary before displaying
   * @return {Element}
   */
  Page.prototype.activate = function() {
    // Run only once
    if (this.active) {
      return this.node;
    }

    // Re-hydrate the HTML
    this.node = dom.createElementFromHTML(this.html);

    // Flag
    this.active = true;

    return this.node;
  };

  /**
   * Deactivate page
   */
  Page.prototype.deactivate = function() {
    this.active = false;

    // Remove hw-accelerated transition properties
    dimensions.clearOffset(/** @type {!Element} */ (this.node));

    // Dispose images properly to avoid memory leaks
    dom.querySelectorAll('img', this.node).
      forEach(dom.disposeImg);

    // Lose page reference
    this.node = null;
  };

  /**
   * Clone this page.
   * @return {!treesaver.layout.Page} A clone of this page
   */
  Page.prototype.clone = function() {
    var p = Object.clone(this);
    // We override the properties that are different by creating a clone
    // and setting those properties explicitly.
    p.node = /** @type {!Element} */ (this.node && this.node.cloneNode(true) || null);
    p.active = this.active;
    return /** @type {!treesaver.layout.Page} */ (p);
  };

  if (goog.DEBUG) {
    Page.prototype.toString = function() {
      return "[Page]";
    };
  }
});
