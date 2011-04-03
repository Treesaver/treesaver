/**
 * @fileoverview Implementation of the HTMl5 Microdata specification.
 */
goog.provide('treesaver.microdata');

goog.require('treesaver.array');
goog.require('treesaver.constants');
goog.require('treesaver.dom');
goog.require('treesaver.string');

if (SUPPORT_MICRODATA && !treesaver.capabilities.SUPPORTS_MICRODATA) {

   /**
   * Returns the itemValue of an Element.
   *
   * @param {!Element} element The element to extract the itemValue for.
   * @return {!string} The itemValue of the element.
   */
  function getItemValue(element) {
    var elementName = element.nodeName;

    if (elementName === 'META') {
      return element.content;
    } else if (['AUDIO', 'EMBED', 'IFRAME',
                'IMG', 'SOURCE', 'VIDEO'].indexOf(elementName) !== -1) {
      return element.src;
    } else if (['A', 'AREA', 'LINK'].indexOf(elementName) !== -1) {
      return element.href;
    } else if (elementName === 'OBJECT') {
      return element.data;
    } else if (elementName === 'TIME' &&
                treesaver.dom.hasAttr(element, 'datetime')) {
      return element.dateTime;
    } else {
      return treesaver.dom.innerText(element);
    }
  }

  /**
   * Returns the properties for the given item.
   *
   * @param {!Element} item The item for which to find the properties.
   * @return {!Array} The properties for the item.
   */
  function getProperties(item) {
    var root = item,
        pending = [],
        properties = [],
        references = [],
        children = [],
        current;

    children = treesaver.array.toArray(root.childNodes);

    pending = children.filter(function(element) {
      return element.nodeType === 1;
    });

    if (treesaver.dom.hasAttr(root, 'itemref')) {
      references = root.getAttribute('itemref').trim().split(/\s+/);

      references.forEach(function(reference) {
        var element = document.getElementById(reference);

        if (element) {
          pending.push(element);
        }
      });
    }

    pending = pending.filter(function(candidate, index) {
      var scope = null,
          parent = candidate,
          ancestors = [];

      // Remove duplicates
      if (pending.indexOf(candidate) !== index &&
          pending.indexOf(candidate, index) !== -1) {
        return false;
      }

      while ((parent = parent.parentNode) !== null && parent.nodeType === 1) {
        ancestors.push(parent);
        if (treesaver.dom.hasAttr(parent, 'itemscope')) {
          scope = parent;
          break;
        }
      }

      if (scope !== null) {
        // If one of the other elements in pending is an ancestor element of
        // candidate, and that element is scope, then remove candidate from
        // pending.
        if (pending.indexOf(scope) !== -1) {
          return false;
        }

        // If one of the other elements in pending is an ancestor element of
        // candidate, and either scope is null or that element also has scope
        // as its nearest ancestor element with an itemscope attribute
        // specified, then remove candidate from pending.
        return !ancestors.some(function(ancestor) {
          var elementIndex = -1,
              elementParent,
              elementScope = null;

          // If ancestor is in pending
          if ((elementIndex = pending.indexOf(ancestor)) !== -1) {
            elementParent = pending[elementIndex];

            // Find the nearest ancestor element with an itemscope attribute
            while ((elementParent = elementParent.parentNode) !== null &&
                    elementParent.nodeType === 1) {
              if (treesaver.dom.hasAttr(elementParent, 'itemscope')) {
                elementScope = elementParent;
                break;
              }
            }
            // The nearest ancestor element equals scope
            if (elementScope === scope) {
              return true;
            }
          }
          return false;
        });
      }
      return true;
    });

    pending.sort(function(a, b) {
      return 3 - (treesaver.dom.compareDocumentPosition(b, a) & 6);
    });

    while ((current = pending.pop())) {
      if (treesaver.dom.hasAttr(current, 'itemprop')) {
        properties.push(current);

        // This is a necessary deviation from the normal algorithm because
        // we can not modify the Element prototype in IE7, so we recursively
        // calculate the properties for each property that has an itemscope.
        if (treesaver.dom.hasAttr(current, 'itemscope')) {
          current['itemScope'] = true;
          current['properties'] = getProperties(current);
        }
      }
      if (!treesaver.dom.hasAttr(current, 'itemscope')) {
        // Push all the child elements of current onto pending, in tree order
        // (so the first child of current will be the next element to be
        // popped from pending).
        children = treesaver.array.toArray(current.childNodes).reverse();
        children.forEach(function(child) {
          if (child.nodeType === 1) {
            pending.push(child);
          }
        });
      }
    }

    properties.forEach(function(property) {
      // Attach the (none-live) itemValue attribute to the element
      if (treesaver.dom.hasAttr(property, 'itemscope')) {
        property['itemValue'] = property;
      } else {
        property['itemValue'] = getItemValue(property);
      }

      property['itemProp'] = property.getAttribute('itemprop');
    });

    return properties;
  }

  /**
   * Returns an Array of the elements in the Document that create items,
   * that are not part of other items, and that are of one of the types
   * given in the argument, if any are listed.
   *
   * @param {?string=} types A space-separated list of types.
   * @param {Element=} root The root element to use as
   * context.
   * @return {!Array} A non-live Array of elements.
   */
  function getItems(types, root) {
    var items = [];

    if (types && /\S/.test(types)) {
      types = types.trim().split(/\s+/);
    } else {
      types = [];
    }

    if (root && treesaver.dom.hasAttr(root, 'itemscope')) {
      items.push(root);
    }

    // Retrieve all microdata items
    items = items.concat(treesaver.dom.getElementsByProperty('itemscope', null, null, root));

    // Filter out top level items, and optionally items that match
    // the given types.
    items = items.filter(function(item) {
      if (!treesaver.dom.hasAttr(item, 'itemprop')) {
        if (types.length === 0 ||
            (treesaver.dom.hasAttr(item, 'itemtype') &&
             types.indexOf(item.getAttribute('itemtype')) !== -1)) {

          item['itemScope'] = true;

          // Attach the (none-live) properties attribute to the element
          item['properties'] = getProperties(item);

          if (treesaver.dom.hasAttr(item, 'itemid')) {
            item['itemId'] = item.getAttribute('itemid');
          }

          if (treesaver.dom.hasAttr(item, 'itemref')) {
            item['itemRef'] = item.getAttribute('itemRef');
          }

          if (treesaver.dom.hasAttr(item, 'itemtype')) {
            item['itemType'] = item.getAttribute('itemtype');
          }

          return true;
        }
      }
      return false;
    });
    return items;
  }
  document['getItems'] = getItems;
}

// This code assumes the microdata API is available. Either
// the implementation above, or a native one.
if (SUPPORT_MICRODATA) {
  /**
   * Returns the JSON representation of a microdata item.
   *
   * @private
   * @param {!Element} item The element to generate the representation for.
   * @return {!Object} The JSON representation of an item.
   */
  treesaver.microdata.getObject_ = function(item) {
    var result = {},
        properties = {},
        flags = {};

    if (item['itemType']) {
      result.type = item['itemType'];
    }
    if (item['itemId']) {
      result.id = item['itemId'];
    }

    if (treesaver.dom.hasAttr(item, 'data-properties')) {
      item.getAttribute('data-properties').split(/\s+/g).
        forEach(function(p) {
          flags[p] = true;
        });
      result.flags = flags;
    }

    item.properties.forEach(function(property) {
      var value = property['itemValue'],
          names = [];

      // If value is an item (i.e. value has an itemScope attribute)
      if (value['itemScope']) {
        value = treesaver.microdata.getObject_(value);
      }

      names = property['itemProp'].split(/\s+/g);

      names.forEach(function(n) {
        if (!properties[n]) {
          properties[n] = [];
        }
        properties[n].push(value);
      });
    });
    result.properties = properties;
    return result;
  };

  /**
   * Returns an Array of the elements in the document or descendants of
   * the root node that create items, that are not part of other items,
   * and that are of one of the types given in the argument, if any are
   * listed.
   *
   * @param {?string=} types A space-separated list of types.
   * @param {HTMLDocument|Element=} root The root element to use as
   * context.
   * @return {!Array} A non-live Array of elements.
   */
  treesaver.microdata.getItems = function(types, root) {
    if (treesaver.capabilities.SUPPORTS_MICRODATA) {
      // Fake the root parameter by filtering out microdata items
      // based on their ancestors.
      var items = treesaver.array.toArray(document.getItems(types));

      if (!root) {
        return items;
      }

      return items.filter(function(item) {
        return root.contains(item);
      });
    } else {
      // We are using our own microdata implementation,
      // which supports the context parameter.
      return document.getItems(types, root);
    }
  };

  /**
   * Returns a JSON representation of the microdata items
   * that match the given types.
   *
   * @param {?string=} types A space-separated list of types.
   * @param {HTMLDocument|Element=} root The root element to use as
   * context.
   * @return {!Array} A Array of Objects representing micro-
   * data items.
   */
  treesaver.microdata.getJSONItems = function(types, root) {
    var items = treesaver.microdata.getItems(types, root);
    return items.map(function(item) {
      return treesaver.microdata.getObject_(item);
    });
  };

  /**
   * Normalizes a microdata item by pulling out values from
   * the properties array and reducing multiple values to a
   * single value.
   *
   * @private
   * @param {!Object} obj The microdata item to normalize.
   * @return {!Object} A normalized microdata item.
   */
  treesaver.microdata.normalizeItem = function (obj) {
    var result = {},
        keys;

    if (obj.properties) {
      keys = Object.keys(obj.properties);
      keys.forEach(function(key) {
        var v = obj.properties[key][0];

        if (treesaver.object.isObject(v)) {
          v = treesaver.layout.normalizeItem(v);
        }
        result[key] = v;
      });
    }
    return result;
  };
}
