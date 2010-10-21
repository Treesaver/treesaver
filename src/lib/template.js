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
 * @param {?Element} scope The element to use as root for template
 * expansion. Defaults to document if not specified explicitly.
 */
treesaver.template.expand = function(view, scope) {
  if (!scope) {
    scope = document;
  }
  treesaver.template.expandObject_(view, scope);
};

/**
 * Helper for template expansion.
 *
 * @private
 * @param {!Object} view The object to expand the template with.
 * @param {!Element|!HTMLDocument} scope The element to use as root for template
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

      if (view.hasOwnProperty(keyName)) {
        value = view[keyName];

        if (Array.isArray(value)) {
          children = treesaver.array.toArray(el.childNodes);
          value.forEach(function(item) {
            children.forEach(function(child) {
              var clone = child.cloneNode(true);
              treesaver.template.expand(item, clone);
              el.appendChild(clone);
            });
          });

          children.forEach(function(child) {
            el.removeChild(child);
          });
        }
        else if (Object.isObject(value)) {
          children = treesaver.array.toArray(el.childNodes);
          children.forEach(function(child) {
            treesaver.template.expand(value, child);
          });
        }
        else {
          if (mapName !== null) {
            if ((mapName === 'href' || mapName === 'src') && treesaver.dom.hasAttr(el, 'data-' + mapName)) {
              text = el.getAttribute('data-' + mapName);
            }
            else {
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
            if (mapName !== null && (mapName === 'href' || mapName === 'src')) {
              // Template in 'href' or 'src'
              text = text.replace('{{' + keyName + '}}', encodeURIComponent(value));
            }
            else if (mapName) {
              // Template in normal attribute (setAttribute will take care of encoding)
              text = text.replace('{{' + keyName + '}}', value);
            }
            else {
              // Template in normal text (escape HTML characters)
              text = text.replace('{{' + keyName + '}}', treesaver.template.escapeHTML(value));
            }
          }
          else {
            text = treesaver.template.escapeHTML(value);
          }

          if (mapName) {
            el.setAttribute(mapName, text);
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
