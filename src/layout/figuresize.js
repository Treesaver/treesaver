/**
 * @fileoverview HTML and other information about a figure's content payload.
 */

goog.provide('treesaver.layout.FigureSize');

goog.require('treesaver.dom');

/**
 * HTML and other information about a figure content payload
 * @param {string} html Content payload.
 * @param {number|string} minW
 * @param {number|string} minH
 * @param {?Array.<string>} requirements
 * @constructor
 */
treesaver.layout.FigureSize = function(html, minW, minH, requirements) {
  this.html = html;

  // TODO: Use outerHTML from the node eventually in order to sanitize bad
  // HTML?

  // Provide a rough measure the element so we know if we can fit within
  // containers
  this.minW = parseInt(minW || 0, 10);
  this.minH = parseInt(minH || 0, 10);

  // TODO: Only store mutable capabilities
  this.requirements = requirements;
};

goog.scope(function() {
  var FigureSize = treesaver.layout.FigureSize,
      dom = treesaver.dom;

  /**
   * The full HTML content for this payload.
   *
   * @type {string}
   */
  FigureSize.prototype.html;

  /**
   * @type {number}
   */
  FigureSize.prototype.minW;

  /**
   * @type {number}
   */
  FigureSize.prototype.minH;

  /**
   * List of required capabilities for this Chrome
   *
   * @type {?Array.<string>}
   */
  FigureSize.prototype.requirements;

  /**
   * @return {boolean} True if the figureSize meets current browser capabilities.
   */
  FigureSize.prototype.meetsRequirements = function() {
    if (!this.requirements) {
      return true;
    }

    return treesaver.capabilities.check(this.requirements, true);
  };

  /**
   * Apply the figure size to the element
   * @param {!Element} container
   * @param {string=} name
   */
  FigureSize.prototype.applySize = function(container, name) {
    if (name) {
      dom.addClass(container, name);
    }

    container.innerHTML = this.html;

    // Find any cloaked images
    dom.querySelectorAll('img[data-src], iframe[data-src], video[data-src], source[data-src], audio[data-src]', container).forEach(function(e) {
      e.setAttribute('src', e.getAttribute('data-src'));
    });
  };

  /**
   * Back out an applied figure size after a failure
   * @param {!Element} container
   */
  FigureSize.prototype.revertSize = function(container, name) {
    // Remove class
    dom.removeClass(container, name);
    // Remove content
    dom.clearChildren(container);
  };

  if (goog.DEBUG) {
    // Expose for testing
    FigureSize.prototype.toString = function() {
      return '[FigureSize: ' + this.index + '/' + this.html + ']';
    };
  }
});
