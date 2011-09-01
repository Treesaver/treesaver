/**
 * @fileoverview DOM helper functions.
 */

goog.provide('treesaver.dom');

goog.require('treesaver.array');
goog.require('treesaver.scheduler');

goog.scope(function() {
  var dom = treesaver.dom,
      array = treesaver.array,
      scheduler = treesaver.scheduler;

  // Mozilla doesn't support element.contains()
  if ('Node' in window && Node.prototype && !('contains' in Node.prototype)) {
    // Fix from PPK
    // http://www.quirksmode.org/blog/archives/2006/01/contains_for_mo.html
    Node.prototype.contains = function(arg) {
      return !!(this.compareDocumentPosition(arg) & 16);
    };
  }

  // Check for classList support, which makes things much simpler
  if ('classList' in document.documentElement) {
    /**
     * Add a CSS class to an element
     *
     * @param {!Element} el
     * @param {!string} className
     */
    dom.addClass = function(el, className) {
      className.split(/\s+/).forEach(function(name) {
        el.classList.add(name);
      });
    };

    /**
     * Remove a CSS class to an element
     *
     * @param {!Element} el
     * @param {!string} className
     */
    dom.removeClass = function(el, className) {
      return el.classList.remove(className);
    };

    /**
     * Check if an element has the given class
     * Hat Tip: Dean Edwards http://dean.edwards.name/IE7/caveats/
     *
     * @param {!Element|!HTMLDocument} el
     * @param {!string} className
     * @return {boolean} True if the element has that class.
     */
    dom.hasClass = function(el, className) {
      return el.classList.contains(className);
    };

    /**
     * @param {!Element} el
     * @return {!Array.<string>} Array of all the element's classes.
     */
    dom.classes = function(el) {
      return array.toArray(el.classList);
    };
  }
  else {
    // Patch for browsers that don't support classList: IE, Safari pre 5.1,
    // Opera pre 11.5, Mobile Safari, and Android pre 3.0
    //
    // All functions here courtesy Dean Edwards:
    // http://dean.edwards.name/IE7/caveats/
    dom.addClass = function(el, className) {
      if (el.className) {
        if (!treesaver.dom.hasClass(el, className)) {
          el.className += ' ' + className;
        }
      }
      else {
        el.className = className;
      }
    };

    dom.removeClass = function(el, className) {
      var regexp = new RegExp('(^|\\s)' + className + '(\\s|$)');
      el.className = el.className.replace(regexp, '$2');
    };

    dom.hasClass = function(el, className) {
      var regexp = new RegExp('(^|\\s)' + className + '(\\s|$)');
      return !!(el.className && regexp.test(el.className));
    };

    dom.classes = function(el) {
      if (!el.className) {
        return [];
      }

      return el.className.split(/\s+/);
    };
  }

  /**
   * Use querySelectorAll on an element tree
   *
   * @param {!string} queryString
   * @param {HTMLDocument|Element=} root Element root (optional).
   * @return {!Array.<Element>} Array of matching elements.
   */
  dom.querySelectorAll = function(queryString, root) {
    if (!root) {
      root = document;
    }

    return array.toArray(root.querySelectorAll(queryString));
  };

  /**
   * Whether the element has the given attribute. Proxy because IE doesn't
   * have the native method
   *
   * @param {!Element} el
   * @param {!string}  propName
   * @return {boolean}
   */
  dom.hasAttr = function(el, propName) {
    return el.hasAttribute(propName);
  };

  /**
   * The namespace prefix for custom elements
   *
   * @const
   * @type {string}
   */
  dom.customAttributePrefix = 'data-ts-';

  /**
   * Whether the element has a custom Treesaver-namespaced attribute
   *
   * @param {!Element} el
   * @param {!string} propName Unescaped.
   * @return {boolean}
   */
  dom.hasCustomAttr = function(el, propName) {
    return dom.hasAttr(el, dom.customAttributePrefix + propName);
  };

  /**
   * Whether the element has a custom Treesaver-namespaced attribute
   *
   * @param {!Element} el
   * @param {!string} propName Unescaped.
   * @return {string}
   */
  dom.getCustomAttr = function(el, propName) {
    return el.getAttribute(dom.customAttributePrefix + propName);
  };

  /**
   * Remove all children from an Element
   *
   * @param {!Element} el
   */
  dom.clearChildren = function(el) {
    // TODO: Blank innerHTML instead?
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  };

  /**
   * InnerText wrapper for browsers that don't have it
   *
   * @param {!Node} node
   * @return {!string} The text content of the node.
   */
  dom.innerText = function(node) {
    return node.textContent;
  };

  /**
   * OuterHTML wrapper for browsers that don't have it
   *
   * @param {!Element} el
   * @return {!string} The outer HTML of the element.
   */
  dom.outerHTML = function(el) {
    // IE, WebKit, and Opera all have outerHTML
    if ('outerHTML' in el) {
      return el.outerHTML;
    }

    // Damn you, Firefox!
    var clone = el.cloneNode(true),
        html;

    // Temporarily place the clone into an empty element
    // and extract its innerHTML
    dom.dummyDiv_.appendChild(clone);
    html = dom.dummyDiv_.innerHTML;
    dom.dummyDiv_.removeChild(clone);

    return html;
  };

  /**
   * Make an element from HTML
   *
   * @param {!string} html
   * @return {?Element}
   */
  dom.createElementFromHTML = function(html) {
    dom.dummyDiv_.innerHTML = html;
    // Only ever return the first child
    var node = dom.dummyDiv_.firstChild;
    dom.clearChildren(dom.dummyDiv_);

    // Make sure it's an actual Element
    if (!node || node.nodeType !== 1) {
      return null;
    }

    return /** @type {!Element} */ (node);
  };

  /**
   * Make a Node from HTML.
   *
   * @param {!string} html The string to parse.
   * @return {?Node} Returns the parsed representation of the
   * html as a DOM node.
   */
  dom.createDocumentFragmentFromHTML = function(html) {
    var node;

    dom.dummyDiv_.innerHTML = html;

    if (dom.dummyDiv_.childNodes.length === 1) {
      node = dom.dummyDiv_.firstChild;
    }
    else {
      node = document.createDocumentFragment();
      while (dom.dummyDiv_.firstChild) {
        node.appendChild(dom.dummyDiv_.firstChild);
      }
    }
    dom.clearChildren(dom.dummyDiv_);

    // Make sure it's an actual Node
    if (!node || !(node.nodeType === 1 || node.nodeType === 11)) {
      return null;
    }

    return /** @type {!Node} */ (node);
  };

  /**
   * Find the first ancestor of the given tagName for an element
   *
   * @param {!Node} el
   * @param {!string} tagName
   * @return {?Node}
   */
  dom.getAncestor = function(el, tagName) {
    var parent = el,
        tag = tagName.toUpperCase();

    while ((parent = parent.parentNode) !== null && parent.nodeType === 1) {
      if (parent.nodeName === tag) {
        return parent;
      }
    }
    return null;
  };


  /**
   * Temporary storage for <img> DOM elements before disposal
   *
   * @private
   * @type {Array.<Element>}
   */
  dom.imgCache_ = [];

  /**
   * Helper for disposing of images in order to avoid memory leaks in iOS
   *
   * @param {!Element} img
   */
  dom.disposeImg = function(img) {
    dom.imgCache_.push(img);

    // Clear out <img> src before unload due to iOS hw-accel bugs
    // Set source to empty gif
    img.setAttribute('src', 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=');

    // Pause to let collection happen
    scheduler.limit(treesaver.dom.clearImgCache_, 3000, [], 'clearImgCache');
  };

  /**
   * Delayed task to lose reference to images
   *
   * @private
   */
  dom.clearImgCache_ = function() {
    // Lose all references
    dom.imgCache_ = [];
  };

  /**
   * Temporary element used for DOM operations
   *
   * @private
   * @type {!Element}
   */
  dom.dummyDiv_ = document.createElement('div');
  // Prevent all layout on the element
  dom.dummyDiv_.style.display = 'none';
});
