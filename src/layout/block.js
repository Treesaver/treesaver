/**
 * @fileoverview A block element.
 */

goog.provide('treesaver.layout.Block');

goog.require('treesaver.array');
goog.require('treesaver.debug');
goog.require('treesaver.dimensions');
goog.require('treesaver.dom');
goog.require('treesaver.layout.Figure');

goog.scope(function() {
  var array = treesaver.array,
      debug = treesaver.debug,
      dimensions = treesaver.dimensions,
      dom = treesaver.dom,
      Figure = treesaver.layout.Figure;

  /**
   * A block element. Includes paragraphs, images, lists, etc.
   * @param {!Node} node HTML node.
   * @param {!number} baseLineHeight The normal line height used across
   *                                 the article content (in pixels).
   * @param {!Object} indices Current block and figure index.
   * @param {?boolean} isFallback Whether child figures should be ignored.
   * @constructor
   */
  treesaver.layout.Block = function(node, baseLineHeight, indices, isFallback) {
    var isReplacedElement = treesaver.layout.Block.isReplacedElement(node),
        hasFigures,
        figureSizes,
        html_zero = '',
        children,
        clone;

    if (goog.DEBUG) {
      if (!indices) {
        debug.warn('Autogen indices. Will not work in production!');
        indices = {
          index: 0,
          figureIndex: 0
        };
      }
    }

    // Is this an HTML element?
    // TODO: Remove this check?
    if (node.nodeType !== 1) {
      debug.error('Non-element sent into Block constructor: ' + node);

      // Ignore whitespace, comments, etc
      this.ignore = true;
      return;
    }

    node = /** @type {!Element} */ (node);

    // Quick check in case the element is display none and should be ignored
    if (!dimensions.getOffsetHeight(node)) {
      // TODO: Check display: none / visibility: collapse
      // This is a very defensive move, since a display: none item that
      // is made visible when in a specific column or grid can really mess up a
      // layout
      debug.warn('Zero-height block ignored');

      this.ignore = true;
      return;
    }

    this.index = indices.index;
    indices.index += 1;

    this.hasBlockChildren = !isReplacedElement &&
      treesaver.layout.Block.hasBlockChildren(node);

    ///////////////
    // Hierarchy
    ///////////////

    this.blocks = [];
    this.figures = [];

    /** @type {?boolean} */
    hasFigures = false;
    if (this.hasBlockChildren && !dom.hasClass(node, 'keeptogether')) {
      // Extract child blocks and figures
      treesaver.layout.Block.
        processChildren(this, node, baseLineHeight, indices, isFallback);

      // TODO: Collapse if there is only one child element

      hasFigures = !!this.figures.length;

      // An item only has block children if it actually has block children
      this.hasBlockChildren = !!this.blocks.length;
    }
    else {
      // TODO: What if there are figures within a keeptogether?
      // Or a paragraph, for that matter
    }

    this.breakable = this.breakable || !isReplacedElement;
    this.keepwithnext = dom.hasClass(node, 'keepwithnext');
    this.columnBreak = dom.hasClass(node, 'columnbreak');
    this.keeptogether = this.keeptogether || !this.breakable ||
                        dom.hasClass(node, 'keeptogether');

    /////////////
    // Metrics
    /////////////

    this.metrics = new dimensions.Metrics(node);

    // Correct line height in case there's a funky non-pixel value
    if (!this.metrics.lineHeight) {
      this.metrics.lineHeight = baseLineHeight;
    }

    // Check if the entire element is a single line, if so then we need to
    // mark keeptogether
    if (!this.keeptogether) {
      this.keeptogether = ((this.metrics.bpHeight + this.metrics.lineHeight) ===
        this.metrics.outerH);
    }

    /**
     * Distance from the top edge of the border to the first line of content
     * @type {number}
     */
    this.firstLine = this.keeptogether ?
      // Unbreakable items have to take the entire content (including bp)
      this.metrics.outerH :
      // No children is just BP plus line height
      !this.hasBlockChildren ? this.metrics.bpTop + this.metrics.lineHeight :
      // With children, but no fallback children it's the border, padding,
      // and first line of first child (unless there is a bpTop, in which
      // case we must add the top margin of the first child)
      !this.containsFallback ?
          this.metrics.bpTop + this.blocks[0].firstLine +
          (this.metrics.bpTop ? this.blocks[0].metrics.marginTop : 0) :
      // When there's a fallback child, it get's tricky, since we don't know
      // whether or not we'll include the fallback element ... for now, just
      // do the same thing we do in our previous case
      // TODO: Fix this
      this.metrics.bpTop + this.blocks[0].firstLine;

    // Litter the element with debug info
    if (goog.DEBUG) {
      node.setAttribute('data-index', this.index);
      node.setAttribute('data-outerHeight', this.metrics.outerH);
      node.setAttribute('data-marginTop', this.metrics.marginTop);
      node.setAttribute('data-marginBottom', this.metrics.marginBottom);
      node.setAttribute('data-firstLine', this.firstLine);
    }

    ////////////
    // HTML
    ////////////

    this.html = dom.outerHTML(node);
    this.openTag = this.hasBlockChildren ?
      this.html.substr(0, this.html.indexOf('>') + 1) : null;
    this.closeTag = this.hasBlockChildren ?
      this.html.slice(this.html.lastIndexOf('<')) : null;

    // If there are figures in this element (or any child),
    // they must not be included in the html
    if (hasFigures) {
      this.html = /** @type {!string} */ (this.openTag);
      this.blocks.forEach(function(block) {
        this.html += block.html;
      }, this);
      this.html += this.closeTag;
    }

    if (this.hasBlockChildren) {
      // We filter out figures and other
      // When breaking a parent element across columns or pages, need to have
      // zero-margin/border/padding versions in order to nest correctly

      // Use a clone so we don't mess up all the HTML up the tree
      clone = /** @type {!Element} */ (node.cloneNode(true));

      if (this.metrics.marginTop) {
        dimensions.setCssPx(clone, 'marginTop', 0);
      }
      if (this.metrics.borderTop) {
        dimensions.setCssPx(clone, 'borderTopWidth', 0);
      }
      if (this.metrics.paddingTop) {
        dimensions.setCssPx(clone, 'paddingTop', 0);
      }
      html_zero = dom.outerHTML(clone);
    }

    this.openTag_zero = this.hasBlockChildren ?
      html_zero.substr(0, html_zero.indexOf('>') + 1) : null;
  };
});

// Use another scope block in order to have a reference to the new Block class
goog.scope(function() {
  var array = treesaver.array,
      Block = treesaver.layout.Block,
      debug = treesaver.debug,
      dimensions = treesaver.dimensions,
      dom = treesaver.dom,
      Figure = treesaver.layout.Figure;

  /**
   * Index of this block within the article
   * @type {!number}
   */
  Block.prototype.index;

  /**
   * @type {boolean}
   */
  Block.prototype.hasBlockChildren;

  /**
   * @type {boolean}
   */
  Block.prototype.isFallback;

  /**
   * @type {boolean}
   */
  Block.prototype.withinFallback;

  /**
   * @type {boolean}
   */
  Block.prototype.containsFallback;

  /**
   * @type {?treesaver.layout.Figure}
   */
  Block.prototype.figure;

  /**
   * Blocks contained within this block
   * @type {?Array.<treesaver.layout.Block>}
   */
  Block.prototype.blocks;

  /**
   * Figures contained within this block
   * @type {?Array.<treesaver.layout.Block>}
   */
  Block.prototype.figures;

  /**
   * Next Sibling
   * @type {?treesaver.layout.Block}
   */
  Block.prototype.nextSibling;

  /**
   * Parent block
   * @type {?treesaver.layout.Block}
   */
  Block.prototype.parent;

  /**
   * Can this block be broken into multiple pieces (across cols/pages)
   * @type {boolean}
   */
  Block.prototype.breakable;

  /**
   * Make sure this block and the next block are in the same column
   * @type {boolean}
   */
  Block.prototype.keepwithnext;

  /**
   * Begin a new column before adding this block
   * @type {boolean}
   */
  Block.prototype.columnBreak;

  /**
   * Should this block remain unbroken, if possible
   * @type {boolean}
   */
  Block.prototype.keeptogether;

  /**
   * @type {!treesaver.dimensions.Metrics}
   */
  Block.prototype.metrics;

  /**
   * Distance from the top edge of the border to the first line of content
   * @type {number}
   */
  Block.prototype.firstLine;

  /**
   * HTML for entire element (content and children)
   * @type {!string}
   */
  Block.prototype.html;

  /**
   * HTML for opening tag
   * @type {?string}
   */
  Block.prototype.openTag;

  /**
   * HTML for closing tag
   * @type {?string}
   */
  Block.prototype.closeTag;

  /**
   * HTML for opening tag when in progress
   * @type {?string}
   */
  Block.prototype.openTag_zero;

  /**
   * Find the next block, never going to children
   *
   * @return {?treesaver.layout.Block} The next block in content that is not
   *                                   contained within this block.
   */
  Block.prototype.getNextNonChildBlock = function() {
    if (this.nextSibling) {
      return this.nextSibling;
    }
    else if (this.parent) {
      return this.parent.getNextNonChildBlock();
    }
    else {
      return null;
    }
  };

  /**
   * Note, this function is re-used by Content
   *
   * @param {!treesaver.layout.Block|treesaver.layout.Content} owner
   * @param {!Element} node
   * @param {!number} baseLineHeight
   * @param {!Object} indices Current block and figure index.
   * @param {?boolean=} isFallback Whether child figures should be ignored.
   */
  Block.processChildren =
    function(owner, node, baseLineHeight, indices, isFallback) {
    var prev,
        isBlock = owner instanceof Block,
        // Is checking 'start' enough here?
        isList = node.nodeName.toLowerCase() === 'ol' && 'start' in node,
        listIndex = isList ? node.start : null;

    // This fix is specifically for Firefox which returns -1 when the
    // `start` or `value` attribute is not set.
    if (listIndex === -1) {
      listIndex = 1;
    }

    array.toArray(node.childNodes).forEach(function(childNode) {
      var child;

      if (isList && childNode.nodeName.toLowerCase() === 'li') {
        // Zero value is ignored (i.e. you can't have item 0)
        if (childNode.value && childNode.value !== -1) {
          listIndex = childNode.value;
        }

        childNode.setAttribute('value', listIndex);
        listIndex += 1;
      }

      if (Figure.isFigure(childNode)) {
        // Want to prevent figures nested within fallbacks (gets confusing)
        if (isFallback) {
          debug.warn('Child figure ignored');

          return; // Next
        }

        child = new Figure(childNode, baseLineHeight, indices);
        owner.figures.push(child);
        if ((child = child.fallback)) {
          child.isFallback = true;
          if (isBlock) {
            owner.containsFallback = true;
          }
        }
      }
      else {
        child = new Block(childNode, baseLineHeight, indices, !!isFallback);
        if (isBlock && !owner.containsFallback) {
          owner.containsFallback = child.containsFallback;
        }
      }

      if (child && !child.ignore) {
        owner.blocks = owner.blocks.concat(child, child.blocks || []);
        // TODO: Clear out children references and convert to indices?

        if (child.figures.length) {
          owner.figures = owner.figures.concat(child.figures);
          // No need to keep them in memory?
          delete child.figures;
        }

        // Keep track of hierarchy
        // But only if owner is a block (i.e. not Figure or Content)
        child.parent = isBlock ?
          (/** @type {!treesaver.layout.Block} */ (owner)) : null;

        if (prev) {
          prev.nextSibling = child;
        }
        prev = child;
      }
    });
  };

  /**
   * @param {?boolean} useZero Whether the open tags should be the
   *                          zero-margin versions.
   * @return {string}
   */
  Block.prototype.openAllTags = function(useZero) {
    var cur = this.parent,
        tags = [];

    while (cur) {
      // Insert in reverse order
      tags.unshift(useZero ? cur.openTag_zero : cur.openTag);
      cur = cur.parent;
    }

    return tags.join('');
  };

  /**
   * @return {string}
   */
  Block.prototype.closeAllTags = function() {
    var cur = this.parent,
        tags = [];

    while (cur) {
      tags.push(cur.closeTag);
      cur = cur.parent;
    }

    return tags.join('');
  };

  /**
   * @return {number}
   */
  Block.prototype.totalBpBottom = function() {
    var cur = this,
        total = cur.metrics.bpBottom;

    while ((cur = cur.parent)) {
      total += cur.metrics.bpBottom;
    }

    return total;
  };

  /**
   * Tries to detect whether this element has children that are blocks,
   * and should therefore be treated more like a <div> (or whatever)
   *
   * Assumptions:
   *   - See definitions for inline_containers and block_containers
   *   - If the element is not in either of those, then we test manually
   *
   * @param {!Element} node
   * @return {boolean} True if the node has children that are blocks.
   */
  Block.hasBlockChildren = function(node) {
    // Assume paragraph nodes are never block parents
    if (Block.isInlineContainer(node)) {
      return false;
    }

    // Assume lists are containers
    if (Block.isBlockContainer(node)) {
      return true;
    }

    // Go through and test the hard way
    var i, len, child,
        childStyle, child_seen = false;

    for (i = 0, len = node.childNodes.length; i < len; i += 1) {
      child = node.childNodes[i];

      // Text node -- check if it's whitespace only
      if (child.nodeType === 3 && /[^\s]/.test(child.data)) {
        // Found non-whitespace text node, bow out now
        return false;
      }
      else if (child.nodeType === 1) {
        // If we see a container, then we are definitely a container ourselves
        if (Block.isInlineContainer(child) || Block.isBlockContainer(child)) {
          return true;
        }

        child_seen = true;
        childStyle = treesaver.css.getStyleObject(child);
        if (/inline/.test(childStyle.display)) {
          // Found an inline text node, bow out
          return false;
        }
        else if (/block/.test(childStyle.display)) {
          // Found a block, means we're a block too
          return true;
        }
      }

      // Ignore non-text, non-element nodes
    }

    // If we've made it this far, it means there are no inline or non-whitespace
    // text nodes, but there could also just be no nodes ... check and make sure
    return child_seen;
  };

  /**
   * TODO: Textarea, fieldset, and other forms?
   * TODO: Remove table
   * @type {Array.<string>}
   */
  Block.replaced_elements = ['img', 'video', 'object', 'embed',
    'iframe', 'audio', 'canvas', 'svg', 'table'];

  /**
   * @param {!Node} el
   * @return {boolean} True if the element is a replaced element.
   */
  Block.isReplacedElement = function(el) {
    var nodeName = el.nodeName.toLowerCase();
    return el.nodeType === 1 &&
          Block.replaced_elements.indexOf(nodeName) !== -1;
  };

  /**
   * @type {Array.<string>}
   */
  Block.inline_containers = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

  /**
   * @param {!Element} el
   * @return {boolean} True if the element is a replaced element.
   */
  Block.isInlineContainer = function(el) {
    var nodeName = el.nodeName.toLowerCase();
    return el.nodeType === 1 &&
          Block.inline_containers.indexOf(nodeName) !== -1;
  };

  /**
   * @type {Array.<string>}
   */
  Block.block_containers = ['div', 'article', 'ul', 'ol', 'figure', 'aside'];

  /**
   * @param {!Element} el
   * @return {boolean} True if the element is a replaced element.
   */
  Block.isBlockContainer = function(el) {
    var nodeName = el.nodeName.toLowerCase();
    return el.nodeType === 1 &&
          Block.block_containers.indexOf(nodeName) !== -1;
  };

  /**
   * Make sure this HTML node adheres to our strict standards
   *
   * @param {!Element} node
   * @param {!number} baseLineHeight
   * @return {Element} The same node passed in (for chaining).
   */
  Block.sanitizeNode = function(node, baseLineHeight) {
    // Should never get text & comment nodes
    if (node.nodeType !== 1) {
      debug.error('Text node sent to sanitize: ' + node);
      return node;
    }

    var i, childNode;

    // Remove IDs, since we can end up with more than one copy of an element
    // in the tree (across column splits, etc)
    node.removeAttribute('id');

    // Assumption is that the Figure can take care of it's own metrics
    if (Figure.isFigure(node)) {
      // TODO: Is there anything that might need to be fixed here?
      //   - Default sizes
      //   - Hybrid?
      return node;
    }

    // Strip out all non-element nodes (textnodes, comments) from block nodes
    if (Block.hasBlockChildren(node) && !dom.hasClass(node, 'keeptogether')) {
      for (i = node.childNodes.length - 1; i >= 0; i -= 1) {
        childNode = node.childNodes[i];
        if (childNode.nodeType !== 1) {
          node.removeChild(childNode);
        }
        else {
          // Sanitize child nodes
          Block.sanitizeNode(childNode, baseLineHeight);
        }
      }
    }
    else {
      // No block nodes, nothing to do?
    }

    // Make sure all our metrics line up with our vertical grid
    if (!window.TS_NO_AUTOMETRICS) {
      Block.normalizeMetrics_(node, baseLineHeight);
    }

    return node;
  };

  /**
   * Normalize the margin, border, and padding to line up with the base
   * line height grid
   *
   * @private
   * @param {!Element} node
   * @param {!number} baseLineHeight
   */
  Block.normalizeMetrics_ = function(node, baseLineHeight) {
    if (!baseLineHeight) {
      debug.error('No line height provided to normalizeMetrics_');
    }

    var metrics = new dimensions.Metrics(node);

    // Enforce margins that are multiples of base line height
    if (metrics.marginTop % baseLineHeight) {
      dimensions.setCssPx(node, 'marginTop',
        dimensions.roundUp(metrics.marginTop, baseLineHeight));
    }
    if (metrics.marginBottom % baseLineHeight) {
      dimensions.setCssPx(node, 'marginBottom',
        dimensions.roundUp(metrics.marginBottom, baseLineHeight));
    }

    // Special handling for unbreakable elements
    if (Block.isReplacedElement(node) || dom.hasClass(node, 'keeptogether')) {
      // TODO: What if there are figures within a keeptogether?
      // Currently, ignore anything in a keeptogether (figures, children, etc)

      // Can't modify the metrics within a replaced element, so just
      // make sure that the outerHeight & margins work out OK
      if (metrics.outerH % baseLineHeight) {
        dimensions.setCssPx(node, 'paddingBottom', metrics.paddingBottom +
            baseLineHeight - metrics.outerH % baseLineHeight);
      }

      // Done
      return node;
    }

    // Enforce a line height that is a multiple of the base line height
    if (!metrics.lineHeight) {
      metrics.lineHeight = baseLineHeight;
      dimensions.setCssPx(node, 'lineHeight', baseLineHeight);
    }
    else if (metrics.lineHeight % baseLineHeight) {
      dimensions.setCssPx(node, 'lineHeight',
        dimensions.roundUp(metrics.lineHeight, baseLineHeight));
    }

    // Make sure border & padding match up
    if (metrics.bpTop % baseLineHeight) {
      dimensions.setCssPx(node, 'paddingTop',
        dimensions.roundUp(metrics.bpTop, baseLineHeight) -
        metrics.borderTop);
    }
    if (metrics.bpBottom % baseLineHeight) {
      metrics.paddingBottom = dimensions.setCssPx(node, 'paddingBottom',
        dimensions.roundUp(metrics.bpBottom, baseLineHeight) -
        metrics.borderBottom);
    }

    // (Potentially) changed padding and line-height, so update outerH
    metrics.outerH = dimensions.getOffsetHeight(node);

    // Sanity check to make sure something out of our control isn't
    // happening
    if (metrics.outerH % baseLineHeight) {
      // Shit, looks like even with the normalization, we're still out of
      // sync. Use padding bottom to fix it up
      debug.info('Forcing padding due to mismatch: ' + node);

      metrics.paddingBottom += baseLineHeight - metrics.outerH % baseLineHeight;

      // Now re-set the paddingBottom
      dimensions.setCssPx(node, 'paddingBottom', metrics.paddingBottom);
    }

    return node;
  };

  if (goog.DEBUG) {
    Block.prototype.toString = function() {
      return '[Block: ' + this.metrics.outerH + '/' +
        this.metrics.lineHeight + ']';
    };
  }
});
