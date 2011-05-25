goog.provide('treesaver.layout.Figure');

goog.require('treesaver.array');
goog.require('treesaver.capabilities');
goog.require('treesaver.dom');
// Block requires Figure, so avoid a circular dependency
//goog.require('treesaver.layout.Block');
goog.require('treesaver.layout.FigureSize'); // trim
goog.require('treesaver.string');

/**
 * A figure element
 * @param {!Element} el HTML element.
 * @param {!number} baseLineHeight The normal line height used across
 *                                 the article content (in pixels).
 * @param {?Object} indices Current block and figure index.
 * @constructor
 */
treesaver.layout.Figure = function(el, baseLineHeight, indices) {
  /** @type {number} */
  this.anchorIndex = indices.index;
  /** @type {number} */
  this.figureIndex = indices.figureIndex;
  indices.figureIndex += 1;
  /** @type {?treesaver.layout.Block} */
  this.fallback = null;
  /** @type {Object.<string, Array.<treesaver.layout.FigureSize>>} */
  this.sizes = {};

  /**
   * Does this figure need to be displayed? If not, then it may be omitted
   * when there is not enough space.
   * @type {boolean}
   */
  this.optional = !treesaver.dom.hasClass(el, 'required');

  /**
   * Does the figure support zooming/lightboxing?.
   * @type {boolean}
   */
  this.zoomable = treesaver.dom.hasClass(el, 'zoomable');

  // Go through and process our sizes
  treesaver.array.toArray(el.childNodes).forEach(function(childNode) {
    if (childNode.nodeType !== 1) {
      // TODO: What if content is just a ext node? (take parent?)
      if (childNode.data && childNode.data.trim()) {
        treesaver.debug.info('textNode ignored in figure: ' + childNode.data);
      }

      return;
    }

    this.processElement(childNode);
  }, this);

  // Now check for a fallback, and process separately
  if (this.sizes['fallback']) {
    // TODO: Support multiple fallbacks?
    // TODO: Requirements on fallback?
    this.processFallback(this.sizes['fallback'][0].html, el, baseLineHeight, indices);

    // Remove the fallback from figure sizes
    delete this.sizes['fallback'];
  }
};

/**
 * @param {!string} html
 * @param {!Node} node HTML node.
 * @param {!number} baseLineHeight The normal line height used across
 *                                 the article content (in pixels).
 * @param {!Object} indices Current block and figure index.
 */
treesaver.layout.Figure.prototype.processFallback = function processFallback(html,
    node, baseLineHeight, indices) {
  // Create the child node
  var parent = node.parentNode,
      fallbackContainer = document.createElement('div'),
      /** @type {!Node} */
      fallbackNode;

  fallbackContainer.innerHTML = html;
  // Is there only one element in our payload?
  if (fallbackContainer.childNodes.length === 1) {
    // Great, just use that one
    fallbackNode = /** @type {!Node} */ fallbackContainer.firstChild;
  }
  else {
    // Use the wrapper as the fallback node
    fallbackNode = fallbackContainer;
  }

  // Cast for compiler
  fallbackNode = /** @type {!Element} */ (fallbackNode);

  // Insert into the tree, to get proper styling
  parent.insertBefore(fallbackNode, node);

  // Add flags into DOM for zooming
  if (this.zoomable) {
    treesaver.dom.addClass(fallbackNode, 'zoomable');
    fallbackNode.setAttribute('data-figureindex', this.figureIndex);
    if (WITHIN_IOS_WRAPPER || treesaver.capabilities.SUPPORTS_TOUCH) {
      // Need dummy handler in order to get bubbled events
      fallbackNode.setAttribute('onclick', 'void(0)');
    }
  }

  // Figures are skipped during sanitization, so must do it manually here
  treesaver.layout.Block.sanitizeNode(fallbackNode, baseLineHeight);

  // Construct
  this.fallback = new treesaver.layout.Block(fallbackNode, baseLineHeight, indices, true);
  this.fallback.figure = this;
  if (this.fallback.blocks) {
    // Set the figure on any child blocks
    this.fallback.blocks.forEach(function(block) {
      block.figure = this;
      block.withinFallback = true;
    }, this);
  }

  // Remove the node
  parent.removeChild(fallbackNode);

  // Done
};

/**
 * Retrieve a qualifying figureSize for the given size name
 *
 * @param {!string} size
 * @return {?treesaver.layout.FigureSize} Null if not found.
 */
treesaver.layout.Figure.prototype.getSize = function(size) {
  var i, len;

  if (this.sizes[size]) {
    for (i = 0, len = this.sizes[size].length; i < len; i += 1) {
      if (this.sizes[size][i].meetsRequirements()) {
        return this.sizes[size][i];
      }
    }
  }

  // None found
  return null;
};

/**
 * Retrieve the largest figureSize that fits within the allotted space
 *
 * @param {!treesaver.dimensions.Size} maxSize
 * @return {?{name: string, figureSize: treesaver.layout.FigureSize}} Null if none fit
 */
treesaver.layout.Figure.prototype.getLargestSize = function(maxSize) {
  var maxW = -Infinity,
      maxH = -Infinity,
      max,
      current;

  for (current in this.sizes) {
    this.sizes[current].forEach(function(figureSize) {
      if (!figureSize.meetsRequirements()) {
        // Not eligible
        return;
      }

      if ((figureSize.minW && figureSize.minW > maxSize.w) ||
          (figureSize.minH && figureSize.minH > maxSize.h)) {
        // Too big
        return;
      }

      // TODO: How to estimate dimensions when no info is provided?
      if ((!figureSize.minW || figureSize.minW >= maxW) &&
          (!figureSize.minH || figureSize.minH >= maxH)) {
        maxW = figureSize.minW;
        maxH = figureSize.minH;
        max = {
          name: current,
          figureSize: figureSize
        };
      }
    });
  }

  return max;
};

/**
 * @param {!Array.<string>} sizes
 * @param {!string} html
 * @param {number} minW
 * @param {number} minH
 * @param {?Array.<string>} requirements
 */
treesaver.layout.Figure.prototype.saveSizes = function saveSizes(sizes, html, minW, minH, requirements) {
  // First, create the FigureSize
  var figureSize = new treesaver.layout.FigureSize(html, minW, minH, requirements);

  sizes.forEach(function(size) {
    if (this.sizes[size]) {
      this.sizes[size].push(figureSize);
    }
    else {
      this.sizes[size] = [figureSize];
    }
  }, this);
};

/**
 * @param {!Element} el
 */
treesaver.layout.Figure.prototype.processElement = function processElement(el) {
  var sizes = el.getAttribute('data-sizes'),
      // Use native width & height if available, otherwise use custom data- properties
      minW = parseInt(el.getAttribute(treesaver.dom.hasAttr(el, 'width') ? 'width' : 'data-minwidth'), 10),
      minH = parseInt(el.getAttribute(treesaver.dom.hasAttr(el, 'height') ? 'height' : 'data-minheight'), 10),
      requirements = treesaver.dom.hasAttr(el, 'data-requires') ?
        el.getAttribute('data-requires').split(' ') : null,
      html;

  if (requirements) {
    if (!treesaver.capabilities.check(requirements)) {
      // Does not meet requirements, skip
      return;
    }
  }

  // Remove class=hidden or hidden attribute in case used for display cloaking
  el.removeAttribute('hidden');
  treesaver.dom.removeClass(el, 'hidden');

  // TODO: Remove properties we don't need to store (data-*)

  // Grab HTML
  html = treesaver.dom.outerHTML(el);

  if (!sizes) {
    sizes = ['fallback'];
  }
  else {
    sizes = sizes.split(' ');
  }

  this.saveSizes(sizes, html, minW, minH, requirements);
};

/**
 * @param {!Element} el
 * @return {boolean} True if the element is a figure.
 */
treesaver.layout.Figure.isFigure = function isFigure(el) {
  var nodeName = el.nodeName.toLowerCase();
  return el.nodeType === 1 && nodeName === 'figure';
};

if (goog.DEBUG) {
  // Expose for testing
  treesaver.layout.Figure.prototype.toString = function toString() {
    return '[Figure: ' + this.index + '/' + this.figureIndex + ']';
  };
}
