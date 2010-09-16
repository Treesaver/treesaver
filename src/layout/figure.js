goog.provide('treesaver.layout.Figure');

goog.require('treesaver.array');
goog.require('treesaver.capabilities');
goog.require('treesaver.dom');
// Block requires Figure, so avoid a circular dependency
//goog.require('treesaver.layout.Block');
goog.require('treesaver.layout.FigureSize');
goog.require('treesaver.string'); // trim

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
  /** @type {Object.<string, {index: number, size: treesaver.layout.FigureSize}>} */
  this.sizes = {};
  /** @type {number } */
  this.sizeCount = 0;

  /**
   * Does this figure need to be displayed? If not, then it may be omitted
   * when there is not enough space.
   * @type {boolean}
   */
  this.optional = !treesaver.dom.hasClass(el, 'required');

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
  if (this.sizes[treesaver.layout.Figure.fallbackString]) {
    this.processFallback(this.sizes[treesaver.layout.Figure.fallbackString].size.html,
        el, baseLineHeight, indices);

    // Remove the fallback from figure sizes
    delete this.sizes[treesaver.layout.Figure.fallbackString];
  }

  // No longer needed
  delete this.sizeCount;
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
  var requires = childNode.getAttribute(treesaver.layout.Figure.dataRequiresString),
      isScript = childNode.nodeName.toLowerCase() === 'script',
      type = !isScript ? null : childNode.getAttribute('type');

  // Check requirements. If we don't meet them, discard
  if (requires && !treesaver.capabilities.check(requires.split(' '))) {
    // Ignore this node
    return;
  }

  if (type) {
    if (type === 'text/html') {
      // Template or cloaked
      if (childNode.getAttribute(treesaver.layout.Figure.dataSizeString)) {
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
 * @param {!Array.<string>} sizes
 * @param {!string} html
 * @param {number} minW
 * @param {number} minH
 */
treesaver.layout.Figure.prototype.saveSizes = function saveSizes(sizes, html, minW, minH) {
  // First, create the FigureSize
  var figureSize = new treesaver.layout.FigureSize(html, minW, minH);

  sizes.forEach(function (size) {
    // We only accept one payload at each size
    if (this.sizes[size]) {
      return;
    }

    this.sizes[size] = {
      index: this.sizeCount,
      size: figureSize
    };

    if (size !== treesaver.layout.Figure.fallbackString) {
      this.sizeCount += 1;
    }
  }, this);
};

/**
 * @param {!Element} el
 */
treesaver.layout.Figure.prototype.processScriptTemplate = function processScriptTemplate(el) {
  var name = el.getAttribute(treesaver.layout.Figure.dataNameString) || '_default',
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
  var sizes = el.getAttribute(treesaver.layout.Figure.dataSizeString).split(' '),
      html = (el.innerText || el.textContent || el.innerHTML).trim(),
      minW = parseInt(el.getAttribute(treesaver.layout.Figure.dataMinWidthString), 10),
      minH = parseInt(el.getAttribute(treesaver.layout.Figure.dataMinHeightString), 10);

  this.saveSizes(sizes, html, minW, minH);
};

/**
 * @param {!Element} el
 */
treesaver.layout.Figure.prototype.processElement = function processElement(el) {
  var sizes = el.getAttribute(treesaver.layout.Figure.dataSizeString),
      minW = parseInt(el.getAttribute(treesaver.layout.Figure.dataMinWidthString), 10),
      minH = parseInt(el.getAttribute(treesaver.layout.Figure.dataMinHeightString), 10),
      html;

  // Remove the properties we don't need to store
  treesaver.layout.Figure.dataPropertyStrings.forEach(function (attr) {
    el.removeAttribute(attr);
  });

  // Grab HTML
  html = treesaver.dom.outerHTML(el);

  if (!sizes) {
    sizes = [treesaver.layout.Figure.fallbackString];
  }
  else {
    sizes = sizes.split(' ');
  }

  this.saveSizes(sizes, html, minW, minH);
};

/**
 * @param {!Element} el
 */
treesaver.layout.Figure.prototype.processTemplateValues = function processTemplateValues(el) {
  var template_name = el.getAttribute(treesaver.layout.Figure.dataTemplateString) || '_default',
      // Extract the JSON
      payload = (el.innerText || el.textContent || el.innerHTML),
      values;

  if (payload) {
    // Parse the JSON
    values = window.JSON.parse(payload);

    // Values must be an Array. It's not really worth doing any sophisticated
    // checks here, so let's just check for length
    if (!values.length) {
      treesaver.debug.error('Non-array passed as template values: ' + values);

      // Ignore
      return;
    }

    // Process each size
    values.forEach(function (val) {
      this.processValue(val, template_name);
    }, this);
  }
  else {
    treesaver.debug.warn('Empty figure template values');
  }
};

/**
 * @param {!Object} value
 */
treesaver.layout.Figure.prototype.processValue = function processValue(value, template_name) {
  if (!value['sizes']) {
    treesaver.debug.error('No sizes parameter in template value');

    // Ignore
    return;
  }

  // Find the appropriate template
  var template = this.templates[value['template'] || template_name],
      html;

  if (!template) {
    treesaver.debug.error('Unknown template name for value: ' + value['template'] || template_name);

    // Ignore
    return;
  }

  // Apply the template
  html = treesaver.layout.Figure.applyTemplate(template, value);

  // Save the sizes
  this.saveSizes(value['sizes'].split(' '), html,
      value['minWidth'], value['minHeight']);
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
    return values[arguments[1].toLowerCase().trim()] || '';
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

/** @type {string} */
treesaver.layout.Figure.fallbackString = 'fallback';
/** @type {string} */
treesaver.layout.Figure.dataSizeString = 'data-sizes';
/** @type {string} */
treesaver.layout.Figure.dataRequiresString = 'data-requires';
/** @type {string} */
treesaver.layout.Figure.dataTemplateString = 'data-template';
/** @type {string} */
treesaver.layout.Figure.dataNameString = 'data-name';
/** @type {string} */
treesaver.layout.Figure.dataMinWidthString = 'data-minWidth';
/** @type {string} */
treesaver.layout.Figure.dataMinHeightString = 'data-minHeight';
/** @type {Array.<string>} */
treesaver.layout.Figure.dataPropertyStrings = [treesaver.layout.Figure.dataSizeString, treesaver.layout.Figure.dataRequiresString,
  treesaver.layout.Figure.dataTemplateString, treesaver.layout.Figure.dataNameString, treesaver.layout.Figure.dataMinWidthString,
  treesaver.layout.Figure.dataMinHeightString];

if (goog.DEBUG) {
  // Expose for testing
  treesaver.layout.Figure.prototype.toString = function toString() {
    return "[Figure: " + this.index + "/" + this.figureIndex + "]";
  };
}
