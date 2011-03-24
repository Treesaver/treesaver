goog.provide('treesaver.template');

goog.require('treesaver.array');
goog.require('treesaver.dom');
goog.require('treesaver.object');
goog.require('treesaver.string');

/**
 * Expand a class-based template using the given view and
 * class to attribute mappings.
 *
 * @param {!Object} view The object to expand the template with.
 * @param {!Element} scope The element to use as root for template
 * expansion.
 */
treesaver.template.expand = function(view, scope) {
  treesaver.template.expandObject_(view, scope);
};

/**
 * Helper for template expansion.
 *
 * @private
 * @param {!Object} view The object to expand the template with.
 * @param {!Element} scope The element to use as root for template
 * expansion.
 */
treesaver.template.expandObject_ = function(view, scope) {
  var matches = {},
      elements = [],
      topLevelElements = [],
      i, j, len, contains;

  // Get all the elements with a data-bind attribute. Unfortunately because of the
  // way we handle key => attribute mappings we can't use the fast querySelectorAll
  // (for example *[data-bind ~= "url"] won't match data-bind="url:href")
  elements = treesaver.dom.getElementsByProperty('data-bind', null, null, scope);

  // Only keep the element if it is not contained in any other element. As soon
  // as we find one element that contains this element we can stop.
  for (i = 0, len = elements.length; i < len; i += 1) {
    contains = false;
    for (j = 0; j < len; j += 1) {
      if (elements[i] !== elements[j] && elements[j].contains(elements[i])) {
        contains = true;
        break;
      }
    }
    if (!contains) {
      topLevelElements.push(elements[i]);
    }
  }

  if (treesaver.dom.hasAttr(scope, 'data-bind')) {
    topLevelElements.push(scope);
  }

  topLevelElements.forEach(function(el) {
    // Split the data-bind value into keys.
    var keys = el.getAttribute('data-bind').split(/\s+/);

    keys.forEach(function(key) {
      var mapIndex = key.indexOf(':'),
          keyName = null,
          mapName = null,
          value = null,
          children = [],
          parent = null,
          text = '';

      if (mapIndex !== -1) {
        keyName = key.substring(0, mapIndex);
        mapName = key.substring(mapIndex + 1);
      }
      else {
        keyName = key;
      }

      if (view[keyName]) {
        value = view[keyName];

        if (treesaver.array.isArray(value)) {
          children = treesaver.array.toArray(el.childNodes);
          value.forEach(function(item) {
            children.forEach(function(child) {
              var clone = child.cloneNode(true);
              if (clone.nodeType === 1) {
                treesaver.template.expand(item, clone);
              }
              el.appendChild(clone);
            });
          });

          children.forEach(function(child) {
            el.removeChild(child);
          });
        }
        else if (treesaver.object.isObject(value)) {
          children = treesaver.array.toArray(el.childNodes);
          children.forEach(function(child) {
            if (child.nodeType === 1) {
              treesaver.template.expand(value, child);
            }
          });
        }
        else {
          if (mapName !== null) {
            if ((mapName === 'href' || mapName === 'src') && treesaver.dom.hasAttr(el, 'data-' + mapName)) {
              // We check if the target attribute exists and it still has unexpanded bindings. If not we
              // retrieve the data template.
              if (!(treesaver.dom.hasAttr(el, mapName) && /{{[^}]+}}/.test(text = el.getAttribute(mapName)))) {
                text = el.getAttribute('data-' + mapName);
              }
            }
            else if (mapName === 'class') {
              text = el.className;
            } else {
              text = el.getAttribute(mapName);
            }
          }
          else {
            text = el.innerHTML;
          }

          if (!value) {
            value = '';
          }
          value = value.toString();

          if (text && /{{[^}]+}}/.test(text)) {
            text = text.replace(/{{([^}]+)}}/g, function(m, n) {
              n = n.trim();
              if (n === keyName) {
                if (mapName !== null && (mapName === 'href' || mapName === 'src')) {
                  return encodeURIComponent(value);
                }
                else if (mapName) {
                  return value;
                }
                else {
                  // Template in normal text (escape HTML characters)
                  return treesaver.template.escapeHTML(value);
                }
              }
              else {
                return '{{' + n + '}}';
              }
            });
          }
          else {
            text = treesaver.template.escapeHTML(value);
          }

          if (mapName) {
            if (mapName === 'class') {
              el.className = text;
            }
            else {
              el.setAttribute(mapName, text);
            }
          }
          else {
            el.innerHTML = text;
          }
        }
      }
    });
  });
};

/**
 * Check if an element has the given data-bind name.
 *
 * @param {!Element|!HTMLDocument} el The element to check.
 * @param {!string} bindName The name to check for.
 * @return {boolean} True if the element has that bind name.
 */
treesaver.template.hasBindName = function(el, bindName) {
  var names = el.getAttribute('data-bind').split(/\s+/);
  return names.some(function(n) {
    var mapIndex = n.indexOf(':');
    if (mapIndex !== -1) {
      return n.substring(0, mapIndex) === bindName;
    }
    else {
      return n === bindName;
    }
  });
};

/**
 * Return elements by bind name (i.e. data-bind="...").
 *
 * @param {!string} bindName Bind name.
 * @param {?string=} tagName Tag name (optional).
 * @param {HTMLDocument|Element=} root    Element root (optional).
 */
treesaver.template.getElementsByBindName = function(bindName, tagName, root) {
  var candidates = treesaver.dom.getElementsByProperty('data-bind', null, tagName, root);

  return candidates.filter(function(candidate) {
    return treesaver.template.hasBindName(candidate, bindName);
  });
};

/**
 * Escapes a string for use in innerHTML.
 *
 * @private
 * @param {string} str The string to escape.
 * @return {!string} The escaped string.
 */
treesaver.template.escapeHTML = function(str) {
  return str.replace(/&(?!\w+;)|[<>]/g, function(s) {
    switch (s) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      default: return s;
    }
  });
};
