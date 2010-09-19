/**
 * @fileoverview DOM helper functions
 */

goog.provide('treesaver.dom');

goog.require('treesaver.array');

/**
 * Add a CSS class to an element
 * Hat Tip: Dean Edwards http://dean.edwards.name/IE7/caveats/
 *
 * @param {!Element} el
 * @param {!string} className
 */
treesaver.dom.addClass = function(el, className) {
  if (el.className) {
    if (!treesaver.dom.hasClass(el, className)) {
      el.className += " " + className;
    }
  }
  else {
    el.className = className;
  }
};

/**
 * Remove a CSS class to an element
 * Hat Tip: Dean Edwards http://dean.edwards.name/IE7/caveats/
 *
 * @param {!Element} el
 * @param {!string} className
 */
treesaver.dom.removeClass = function(el, className) {
  var regexp = new RegExp("(^|\\s)" + className + "(\\s|$)");
  el.className = el.className.replace(regexp, "$2");
};

/**
 * Check if an element has the given class
 * Hat Tip: Dean Edwards http://dean.edwards.name/IE7/caveats/
 *
 * @param {!Element} el
 * @param {!string} className
 * @return {boolean} True if the element has that class
 */
treesaver.dom.hasClass = function(el, className) {
  var regexp = new RegExp("(^|\\s)" + className + "(\\s|$)");
  return !!(el.className && regexp.test(el.className));
};

/**
 * @param {!Element} el
 * @return {!Array.<string>} Array of all the element's classes
 */
treesaver.dom.classes = function(el) {
  return el.className && el.className.split ?
    el.className.split(/\s+/) : [];
};

/**
 * Query an element tree using a class name
 *
 * @param {!string} className
 * @param {HTMLDocument|Element=} root Element root (optional)
 * @return {!Array.<Element>} Array of matching elements
 */
treesaver.dom.getElementsByClassName = function(className, root) {
  if (!root) {
    root = document;
  }

  var result = [];

  // Use native functions whenever possible
  if (!SUPPORT_LEGACY || 'getElementsByClassName' in root) {
    result = treesaver.array.toArray(
      root.getElementsByClassName(className)
    );
  }
  else if (SUPPORT_IE && 'querySelectorAll' in root) {
    // IE8 has QSA, but no getElementsByClassName
    result = treesaver.array.toArray(
      root.querySelectorAll('.' + className)
    );
  }
  else if (SUPPORT_LEGACY) {
    // Slow path for old browsers (IE7)
    // TODO: Use a faster/better implementation?
    var allElements = root.getElementsByTagName('*'),
        classPattern = new RegExp("(^|\\s)" + className + "(\\s|$)");

    treesaver.array.toArray(allElements).forEach(function (child) {
      if (classPattern.test(child.className)) {
        result.push(child);
      }
    });
  }

  return result;
};

/**
 * Query an element tree by tag name
 *
 * @param {!string} tagName
 * @param {HTMLDocument|Element=} root Element root (optional)
 * @return {!Array.<Element>} Array of matching elements
 */
treesaver.dom.getElementsByTagName = function(tagName, root) {
  if (!root) {
    root = document;
  }

  return treesaver.array.toArray(root.getElementsByTagName(tagName));
};

/**
 * Query an element by property name and value
 *
 * In modern browsers, this wraps querySelectorAll
 *
 * @param {!string} propName Property name
 * @param {?string=} value   Value contained (optional)
 * @param {?string=} tagName Tag name (optional)
 * @param {HTMLDocument|Element=} root    Element root (optional)
 */
treesaver.dom.getElementsByProperty = function(propName, value, tagName, root) {
  tagName = tagName || '*';

  // Modern browsers do this quite well via querySelectorAll
  if (!SUPPORT_LEGACY || 'querySelectorAll' in root) {
    if (!root) {
      root = document;
    }

    // Construct a selector via the arguments
    var selector = tagName + '[' + propName +
      // Note, this queries based on a space separated single value match
      (value ? '~=' + value : '') + ']';

    return treesaver.array.toArray(root.querySelectorAll(selector));
  }
  else {
    // Have to do the work manually
    var result = [],
        elements = treesaver.dom.getElementsByTagName(tagName, root),
        // Use a regexp to test if there is a value, otherwise mock out a test
        // function to always return true
        regexp = value ? new RegExp("(^|\\s)" + value + "(\\s|$)")
          : { test: function() { return true; } };

    // Cycle through each element and test
    // Note: This is pretty slow, but that's what you get for using an
    // old browser
    elements.forEach(function (el) {
      if (treesaver.dom.hasAttr(el, propName) && regexp.test(el.getAttribute(propName))) {
        result.push(el);
      }
    });

    return result;
  }
};

/**
 * Whether the element has the given attribute. Proxy because IE doesn't
 * have the native method
 *
 * @param {!Element} el
 * @param {!string}  propName
 * @return {boolean}
 */
treesaver.dom.hasAttr = function(el, propName) {
  if (!SUPPORT_IE || 'hasAttribute' in el) {
    return el.hasAttribute(propName);
  }
  else {
    return typeof el.getAttribute(propName) !== 'undefined';
  }
};

/**
 * Remove all children from an Element
 *
 * @param {!Element} el
 */
treesaver.dom.clearChildren = function(el) {
  // TODO: Blank innerHTML instead?
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
};

/**
 * InnerText wrapper for browsers that don't have it
 *
 * @param {!Node} node
 * @return {!string} The text content of the node
 */
treesaver.dom.innerText = function(node) {
  if (!SUPPORT_IE || 'textContent' in node) {
    return node.textContent;
  }

  // IE-only fallback
  return node.innerText
};

/**
 * OuterHTML wrapper for browsers that don't have it
 *
 * @param {!Element} el
 * @return {!string} The outer HTML of the element
 */
treesaver.dom.outerHTML = function(el) {
  // IE, WebKit, and Opera all have outerHTML
  if (el.outerHTML) {
    return el.outerHTML;
  }

  // Damn you, Firefox!
  var clone = el.cloneNode(true),
      html;

  // Temporarily place the clone into an empty element
  // and extract its innerHTML
  treesaver.dom.dummyDiv_.appendChild(clone);
  html = treesaver.dom.dummyDiv_.innerHTML;
  treesaver.dom.dummyDiv_.removeChild(clone);

  return html;
};

/**
 * Make an element from HTML
 *
 * @param {!string} html
 * @return {Element|null}
 */
treesaver.dom.createElementFromHTML = function(html) {
  // Container must be in tree to ensure proper HTML5 parsing by IE
  if (SUPPORT_IE) {
    document.body.appendChild(treesaver.dom.dummyDiv_);
  }

  treesaver.dom.dummyDiv_.innerHTML = html;
  // Only ever return the first child
  var node = treesaver.dom.dummyDiv_.firstChild;
  treesaver.dom.clearChildren(treesaver.dom.dummyDiv_);

  if (SUPPORT_IE) {
    document.body.removeChild(treesaver.dom.dummyDiv_);
  }

  // Make sure it's an actual Element
  if (!node || node.nodeType !== 1) {
    return null;
  }

  return /** @type {!Element} */ (node);
};

if ('Node' in window && Node.prototype && !Node.prototype.contains) {
  // Mozilla doesn't support contains() fix from PPK
  // http://www.quirksmode.org/blog/archives/2006/01/contains_for_mo.html
  Node.prototype.contains = function(arg) {
    return !!(this.compareDocumentPosition(arg) & 16);
  };
}

/**
 * Temporary element used for DOM operations
 * @type {!Element}
 */
treesaver.dom.dummyDiv_ = document.createElement('div');
// Prevent all layout on the element
treesaver.dom.dummyDiv_.style.display = "none";
