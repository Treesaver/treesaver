goog.provide('treesaver.layout.Figure');

goog.require('treesaver.array');
goog.require('treesaver.capabilities');
goog.require('treesaver.dom');
// Block requires Figure, so avoid a circular dependency
//goog.require('treesaver.layout.Block');
goog.require('treesaver.layout.FigureSize');
goog.require('treesaver.string'); // trim
goog.require('treesaver.json');

/**
 * A figure element
 * @param {!Element} el HTML element
 * @param {!number} baseLineHeight The normal line height used across
 *                                 the article content (in pixels)
 * @param {?Object} indices Current block and figure index
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

  /**
   * Temporarily holds any content templates
   * @private
   * @type {Array.<string>}
   */
  this.templates = [];

  // Go through and process our sizes
  treesaver.array.toArray(el.childNodes).forEach(function (childNode) {
    if (childNode.nodeType !== 1) {
      // TODO: What if content is just a ext node? (take parent?)
      if (childNode.data && childNode.data.trim()) {
        treesaver.debug.info('textNode ignored in figure: ' + childNode.data);
      }

      return;
    }

    this.processChildNode(childNode, baseLineHeight, indices);
  }, this);

  // Now check for a fallback, and process separately
  if (this.sizes['fallback']) {
    // TODO: Support multiple fallbacks?
    // TODO: Requirements on fallback?
    this.processFallback(this.sizes['fallback'][0].html, el, baseLineHeight, indices);

    // Remove the fallback from figure sizes
    delete this.sizes['fallback'];
  }

  // No longer needed
  delete this.templates;
}

/**
 * @param {!string} html
 * @param {!Node} node HTML node
 * @param {!number} baseLineHeight The normal line height used across
 *                                 the article content (in pixels)
 * @param {!Object} indices Current block and figure index
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
  }

  // Figures are skipped during sanitization, so must do it manually here
  treesaver.layout.Block.sanitizeNode(fallbackNode, baseLineHeight);

  // Construct
  this.fallback = new treesaver.layout.Block(fallbackNode, baseLineHeight, indices, true);
  this.fallback.figure = this;

  // Remove the node
  parent.removeChild(fallbackNode);

  // Done
};

/**
 * There are multiple formats for figure content payloads:
 *
 *   1. Normal
 *   2. Cloaked
 *   3. Templated
 *
 * Normal:
 * These are just element nodes in the tree, nothing special about
 * them, just extract the HTML.
 *
 * <figure>
 *   <p data-sizes="pullquote fallback">Hello, I said!</p>
 * </figure>
 *
 * Cloaked:
 * Figure content is hidden within a script tag, to prevent non-JS
 * clients from seeing the content.
 *
 * <figure>
 *   <script type="text/html" data-sizes="onecolumn">
 *     <img src="image.jpg" />
 *   </script>
 *   <div data-sizes="fallback">
 *     Fallback content.
 *   </div>
 * </figure>
 *
 * Templated:
 * Figure content is generated from an HTML template plus a set of
 * JSON values
 *
 * <figure>
 *   <script type="text/html" data-name="imagetemplate">
 *     <img src="{{ src }}" />
 *   </script>
 *   <script type="application/json" data-template="imagetemplate">
 *     [
 *       {
 *         'sizes': 'onecolumn',
 *         'src': 'image.jpg'
 *       },
 *       {
 *         'sizes: 'twocolumn',
 *         'src': 'image2.jpg'
 *       }
 *     ]
 *   </script>
 *   <div data-sizes="fallback">
 *     Fallback content.
 *   </div>
 * </figure>
 *
 * @param {!Element} childNode
 * @param {!number} baseLineHeight The normal line height used across
 *                                 the article content (in pixels)
 * @param {?Object} indices Current block and figure index
 */
treesaver.layout.Figure.prototype.processChildNode =
  function processChildNode(childNode, baseLineHeight, indices) {
  var type;

  // Script payload?
  if (childNode.nodeName.toLowerCase() === 'script') {
    type = childNode.getAttribute('type');

    if (type === 'text/html') {
      // Template or cloaked? Cloaked elements have a data-size property
      if (treesaver.dom.hasAttr(childNode, 'data-sizes')) {
        this.processCloaked(childNode);
      }
      else {
        this.processScriptTemplate(childNode);
      }
      return;
    }
    else if (type === 'application/json') {
      this.processTemplateValues(childNode);
      return;
    }

    // What to do with unknown types?
    treesaver.debug.warn('Unknown script type: ' + type);
  }
  else {
    // Element payload
    this.processElement(childNode);
  }
};

/**
 * Retrieve a qualifying figureSize for the given size name
 *
 * @param {!string} size
 * @return {?treesaver.layout.FigureSize} Null if not found
 */
treesaver.layout.Figure.prototype.getSize = function(size) {
  var i, len;

  if (this.sizes[size]) {
    for (i = 0, len = this.sizes[size].length; i < len; i += 1) {
      if (this.sizes[size][i].meetsRequirements()) {
        return this.sizes[size][i];
      }
    };
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
    this.sizes[current].forEach(function (figureSize) {
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

  sizes.forEach(function (size) {
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
treesaver.layout.Figure.prototype.processScriptTemplate = function processScriptTemplate(el) {
  var name = el.getAttribute('data-name') || '_default',
      // Extract the HTML template
      payload = treesaver.dom.innerText(el) || el.innerHTML;

  // Only save if we have content
  if (payload) {
    this.templates[name] = payload.trim();
  }
  else {
    treesaver.debug.warn('Empty figure template: ' + name);
  }
};

/**
 * @param {!Element} el
 */
treesaver.layout.Figure.prototype.processCloaked = function processCloaked(el) {
  var sizes = el.getAttribute('data-sizes').split(' '),
      html = (el.innerText || el.textContent || el.innerHTML).trim(),
      minW = parseInt(el.getAttribute('data-minwidth'), 10),
      minH = parseInt(el.getAttribute('data-minheight'), 10),
      requirements = treesaver.dom.hasAttr(el, 'data-requires') ?
        el.getAttribute('data-requires').split(' ') : null;

  if (requirements) {
    if (!treesaver.capabilities.check(requirements)) {
      // Does not meet requirements, skip
      return;
    }
  }

  this.saveSizes(sizes, html, minW, minH, requirements);
};

/**
 * @param {!Element} el
 */
treesaver.layout.Figure.prototype.processElement = function processElement(el) {
  var sizes = el.getAttribute('data-sizes'),
      minW = parseInt(el.getAttribute('data-minwidth'), 10),
      minH = parseInt(el.getAttribute('data-minheight'), 10),
      requirements = treesaver.dom.hasAttr(el, 'data-requires') ?
        el.getAttribute('data-requires').split(' ') : null,
      html;

  if (requirements) {
    if (!treesaver.capabilities.check(requirements)) {
      // Does not meet requirements, skip
      return;
    }
  }

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
 */
treesaver.layout.Figure.prototype.processTemplateValues = function processTemplateValues(el) {
  var template_name = el.getAttribute('data-template') || '_default',
      // Extract the JSON
      payload = (el.innerText || el.textContent || el.innerHTML),
      values;

  if (payload) {
    // Parse the JSON
    values = treesaver.json.parse(payload);

    // Values must be an Array. It's not really worth doing any sophisticated
    // checks here, so let's just check for forEach
    if (values.forEach) {
      // Process each size
      values.forEach(function (val) {
        this.processValue(val, template_name);
      }, this);
    }
    else {
      treesaver.debug.error('Non-array passed as template values: ' + values);

      // Ignore
      return;
    }
  }
  else {
    treesaver.debug.warn('Empty figure template values');
  }
};

/**
 * @param {!Object} value
 * @param {string} default_template
 */
treesaver.layout.Figure.prototype.processValue = function processValue(value, default_template) {
  if (!value['sizes']) {
    treesaver.debug.error('No sizes parameter in template value');

    // Ignore
    return;
  }

  // Find the appropriate template
  var template = this.templates[value['template'] || default_template],
      html,
      requirements = value['requires'] ? value['requires'].split(' ') : null;

  if (requirements) {
    if (!treesaver.capabilities.check(requirements)) {
      // Does not meet requirements, skip
      return;
    }
  }

  if (!template) {
    treesaver.debug.error('Unknown template name for value: ' +
        value['template'] || default_template);

    // Ignore
    return;
  }

  // Apply the template
  html = treesaver.layout.Figure.applyTemplate(template, value);

  // Save the sizes
  this.saveSizes(value['sizes'].split(' '), html, value['minWidth'],
    value['minHeight'], requirements);
};

/**
 * @type {!RegExp}
 */
treesaver.layout.Figure.templateRegex = new RegExp("{{([^}]+)}}", 'g');

/**
 * @param {!string} template
 * @param {!Object} values
 */
treesaver.layout.Figure.applyTemplate = function applyTemplate(template, values) {
  // Replace {{ name }} with appropriate value (or blank if not found)
  return template.replace(treesaver.layout.Figure.templateRegex, function () {
    var name = arguments[1].trim();

    // Protect against case-sensitivity errors
    return values[name] || values[name.toLowerCase()] || '';
  });
};

/**
 * @param {!Element} el
 * @return {boolean} True if the element is a figure
 */
treesaver.layout.Figure.isFigure = function isFigure(el) {
  var nodeName = el.nodeName.toLowerCase();
  return el.nodeType === 1 && nodeName === 'figure';
};

if (goog.DEBUG) {
  // Expose for testing
  treesaver.layout.Figure.prototype.toString = function toString() {
    return "[Figure: " + this.index + "/" + this.figureIndex + "]";
  };
}
