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
 * @param {!Object} mappings An object defining which class
 * names map to attributes. For example: { url: 'href' } would
 * map the 'url' class to the href attribute.
 * @param {?Element} scope The element to use as root for template
 * expansion. Defaults to document if not specified explicitly.
 */
treesaver.template.expand = function(view, mappings, scope) {
  var buffer = [];
  if (!scope) {
    scope = document;
  }
  treesaver.template.expandObject_(view, mappings, scope);
};

/**
 * Helper for template expansion.
 *
 * @private
 * @param {!Object} view The object to expand the template with.
 * @param {!Object} mappings An object defining which class
 * names map to attributes. For example: { url: 'href' } would
 * map the 'url' class to the href attribute.
 * @param {!Element} scope The element to use as root for template
 * expansion.
 */
treesaver.template.expandObject_ = function(view, mappings, scope) {
  var keys = Object.keys(view),
      matches = {};

  keys.forEach(function(key) {
    var elements = [];

    if (matches[key]) {
      return;
    }

    elements = treesaver.dom.getElementsByClassName(key, scope);

    if (treesaver.dom.hasClass(scope, key)) {
      elements.push(scope);
    }

    elements.forEach(function(e) {
      if (Array.isArray(view[key])) {
        if (!mappings[key]) {
          elements = treesaver.dom.getElementsByClassName(key, scope);

          elements.forEach(function(e) {
            var template, parent;

            // Find the first element that has a template attribute
            treesaver.array.toArray(e.childNodes).every(function(node) {
              if (treesaver.dom.hasClass(node, 'template')) {
                template = node;
                return false;
              }
            });

            parent = template.parentNode;

            view[key].forEach(function(item) {
              var node = template.cloneNode(true);
              treesaver.template.expandObject_(item, mappings, node);
              parent.appendChild(node);
            });

            parent.removeChild(template);
          });
        } else {
          treesaver.debug.error(
            'treesaver.template: You can not map an array to an attribute.'
          );
        }
      } else if (Object.isObject(view[key])) {
        if (!mappings[key]) {
          elements = treesaver.dom.getElementsByClassName(key, scope);

          // TODO: remove duplicates and non top-level children
          elements.forEach(function(e) {
            treesaver.template.expandObject_(view[key], mappings, e);
          });
        } else {
          treesaver.debug.error(
            'treesaver.template: You can not map an object to an attribute.'
          );
        }
      } else {
        var text;

        // If we have a custom mapping from class name to attribute
        if (mappings[key]) {
          text = e.getAttribute(mappings[key]);
        } else {
          text = e.innerHTML;
        }

        // Are we dealing with an inline template or can we simply
        // replace the whole innerHTML.
        if (treesaver.template.regex_.test(text)) {
          text = text.replace(treesaver.template.regex_, function() {
            var templateKey = arguments[1].toLowerCase().trim();
            if (view[templateKey]) {
              matches[templateKey] = true;
              return treesaver.template.escape_(
                view[templateKey],
                false,
                mappings[key]
              );
            } else {
              matches[templateKey] = false;
              return '';
            }
          });
        } else {
          text = treesaver.template.escape_(view[key], true, mappings[key]);
        }
        if (mappings[key]) {
          e.setAttribute(mappings[key], text);
        } else {
          e.innerHTML = text;
        }
      }
    });
  });

  if (goog.DEBUG) {
    Object.keys(matches).forEach(function(key) {
      if (!matches[key]) {
        treesaver.debug.warn(
          'treesaver.template: Did not match "' + key + '".'
        );
      }
    });
  }
};

/**
 * Escapes a string for use in attributes, URLs or innerHTML.
 *
 * @private
 * @param {string} str The string to escape.
 * @param {!boolean} subpart Whether the string is substring of another
 * string.
 * @param {?string} attributeName Optional attribute name to look up in
 * the treesaver.template.escapeURL object.
 * @return {!string} The escaped string.
 */
treesaver.template.escape_ = function(str, subpart, attributeName) {
  if (!str) {
    return '';
  }

  str = str.toString();

  if (!subpart && attributeName &&
        treesaver.template.escapeURL_[attributeName]) {
    return encodeURIComponent(str);
  } else if (attributeName) {
    // Since we're using setAttribute we don't need to do any custom escaping.
    return str;
  }

  return str.replace(/&(?!\w+;)|[<>]/g, function(s) {
    switch (s) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      default: return s;
    }
  });
};

/**
 * Regular expression to match template substitutions.
 * @private
 * @type {!RegExp}
 */
treesaver.template.regex_ = new RegExp('{{([^}]+)}}', 'g');

/**
 * A lookup table for attributes that need to be escaped as URL,
 * or as URL components.
 * @private
 * @type {!Object}
 */
treesaver.template.escapeURL_ = {
  href: true,
  src: true
};
