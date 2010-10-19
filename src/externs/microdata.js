/**
 * Externs file for HTML5 microdata API, which isn't implemented yet ...
 */

/**
 * @type {Array}
 */
Element.prototype.properties;

/**
 * @type {Array.<Element>}
 */
Element.prototype.items;

/**
 * @type {*}
 */
Element.prototype.itemValue;

/**
 * @type {?String}
 */
Element.prototype.itemProp;

/**
 * @param {?string=} types A space-separated list of types.
 * @param {HTMLDocument|Element=} root The root element to use as
 * context.
 * @return {!Array} A non-live Array of elements.
 */
document.getItems = function(types, root) { };
