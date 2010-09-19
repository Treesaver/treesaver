/**
 * @fileoverview Helpers for measuring elements
 */

goog.provide('treesaver.dimensions');

/**
 * Alias for Size type
 *
 * @typedef {{ w: number, h: number }}
 */
treesaver.dimensions.Size;

/**
 * Alias for SizeRange type
 *
 * @typedef {{ width: number, height: number, maxW: number, maxH: number }}
 */
treesaver.dimensions.SizeRange;

/**
 * Whether the given size fits within the bounds set by the range
 *
 * @param {treesaver.dimensions.SizeRange} range
 * @param {treesaver.dimensions.Size} size
 * @return {boolean} True if both dimensions are within the min and max
 */
treesaver.dimensions.inSizeRange = function(range, size) {
  if (!range) {
    return false;
  }

  return size.w >= range.minW &&size.h >= range.minH &&
    // If Max isn't set, assume Infinity
    (!range.maxW || size.w <= range.maxW) &&
    (!range.maxH || size.h <= range.maxH);
};

/**
 *
 * @param {treesaver.dimensions.SizeRange} a
 * @param {treesaver.dimensions.Metrics} b
 * @param {boolean} outer
 * @return {treesaver.dimensions.SizeRange}
 */
treesaver.dimensions.mergeSizeRange = function(a, b, outer) {
  a = a || {};
  b = b || {};

  var bpHeight = outer ? b.bpHeight ||
        (b.outerHeight ? b.outerHeight - b.height : 0) : 0,
      bpWidth = outer ? b.bpWidth ||
        (b.outerWidth ? b.outerWidth - b.width : 0) : 0;

  return {
    width: Math.max(a.width || 0, (b.width + bpWidth) || 0),
    height: Math.max(a.height || 0, (b.height + bpHeight) || 0),
    maxW: Math.min(a.maxW || Infinity,
        b.maxW + bpWidth || Infinity),
    maxH: Math.min(a.maxH || Infinity,
        b.maxH + bpHeight || Infinity)
  };
};

/**
 * Convert a string value to pixels
 *
 * @param {?string} val
 * @return {?number} Value in pixels
 */
treesaver.dimensions.toPixels = function(val) {
  if (val && val.indexOf('px') !== -1) {
    return parseFloat(val);
  }

  return null;
};

/**
 * Return the computedStyle object, which varies based on
 * browsers
 * @param {!Element} el
 * @return {Object}
 */
treesaver.dimensions.getStyleObject = function(el) {
  return document.defaultView.getComputedStyle(el, null);
};

// IE doesn't support getComputedStyle
if (SUPPORT_IE &&
    !(document.defaultView && document.defaultView.getComputedStyle)) {
  // Patch to use MSIE API
  treesaver.dimensions.getStyleObject = function(el) {
    return el.currentStyle;
  };
}

/**
 * Helper for setting a CSS value in pixels
 *
 * @param {!Element} el
 * @param {!string} propName
 * @param {!number} val
 * @return {!number} The value supplied
 */
treesaver.dimensions.setCssPx = function(el, propName, val) {
  el.style[propName] = val + 'px';

  return val;
};


/**
 * Round up to the nearest multiple of the base number
 *
 * @param {!number} number
 * @param {!number} base
 * @return {number} A multiple of the base number
 */
treesaver.dimensions.roundUp = function(number, base) {
  return Math.ceil(number) + base - (number % base);
};

/**
 * The style dimensions of an element including margin, border, and
 * padding as well as line height
 *
 * @constructor
 * @param {!Element=} el
 */
treesaver.dimensions.Metrics = function(el) {
  if (!el) {
    return;
  }

  var style = treesaver.dimensions.getStyleObject(el),
      oldPosition = el.style.position,
      oldStyleAttribute = el.getAttribute('style');

  this.display = style.display;
  this.position = style.position;

  // Webkit gives incorrect right margins for non-absolutely
  // positioned elements
  //if (this.position !== 'absolute') {
    //el.style.position = 'absolute';
  //}
  // Disable this for now, as it can give incorrect formatting
  // for elements in the flow
  // Also: Getting computed style is kinda silly if we change the
  // styling -- may affect the measurements anyway

  // Margin
  this.marginTop = treesaver.dimensions.toPixels(style.marginTop) || 0;
  this.marginBottom = treesaver.dimensions.toPixels(style.marginBottom) || 0;
  this.marginLeft = treesaver.dimensions.toPixels(style.marginLeft) || 0;
  this.marginRight = treesaver.dimensions.toPixels(style.marginRight) || 0;
  // Summed totals
  this.marginHeight = this.marginTop + this.marginBottom;
  this.marginWidth = this.marginLeft + this.marginRight;

  // Border
  this.borderTop = treesaver.dimensions.toPixels(style.borderTopWidth) || 0;
  this.borderBottom = treesaver.dimensions.toPixels(style.borderBottomWidth) || 0;
  this.borderLeft = treesaver.dimensions.toPixels(style.borderLeftWidth) || 0;
  this.borderRight = treesaver.dimensions.toPixels(style.borderRightWidth) || 0;

  // Padding
  this.paddingTop = treesaver.dimensions.toPixels(style.paddingTop) || 0;
  this.paddingBottom = treesaver.dimensions.toPixels(style.paddingBottom) || 0;
  this.paddingLeft = treesaver.dimensions.toPixels(style.paddingLeft) || 0;
  this.paddingRight = treesaver.dimensions.toPixels(style.paddingRight) || 0;

  // Summed totals for border & padding
  this.bpTop = this.borderTop + this.paddingTop;
  this.bpBottom = this.borderBottom + this.paddingBottom;
  this.bpHeight = this.bpTop + this.bpBottom;
  this.bpLeft = this.borderLeft + this.paddingLeft;
  this.bpRight = this.borderRight + this.paddingRight;
  this.bpWidth = this.bpLeft + this.bpRight;

  // Outer Width & Height
  this.outerW = el.offsetWidth;
  this.outerH = el.offsetHeight;

  // Inner Width & Height
  this.width = this.outerW - this.bpWidth;
  this.height = this.outerH - this.bpHeight;

  // Min & Max : Width & Height
  this.minW = treesaver.dimensions.toPixels(style.minWidth) || 0;
  this.maxW = treesaver.dimensions.toPixels(style.maxWidth) || Infinity;
  this.minH = treesaver.dimensions.toPixels(style.minHeight) || 0;
  this.maxH = treesaver.dimensions.toPixels(style.maxHeight) || Infinity;

  // Line height
  this.lineHeight = treesaver.dimensions.toPixels(style.lineHeight) || null;

  // Restore the original position property on style
  //if (this.position !== 'absolute') {
    //el.style.position = oldPosition;
    //if (!el.getAttribute('style')) {
      //el.removeAttribute('style');
    //}
  //}
};

/**
 * Make a copy of the object
 *
 * @return {!treesaver.dimensions.Metrics}
 */
treesaver.dimensions.Metrics.prototype.clone = function() {
  var copy = new treesaver.dimensions.Metrics(),
      key;

  for (key in this) {
    if (copy[key] !== this[key]) {
      copy[key] = this[key];
    }
  }

  return copy;
};

// TODO: MergeSizeRange

if (goog.DEBUG) {
  treesaver.dimensions.Metrics.prototype.toString = function() {
    return "[Metrics: " + this.width + "x" + this.height + "]";
  };
}
