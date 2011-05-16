goog.provide('treesaver.object');

if (!Object.keys) {
  /**
   * Returns the keys in an object.
   *
   * Note: Annotation removed for closure (present in externs)
   */
  Object.keys = function(o) {
    var result = [];
    for (var name in o) {
      if (o.hasOwnProperty(name)) {
        result.push(name);
      }
    }
    return result;
  };
}

/**
 * Test whether or not a value is an object.
 *
 * @param {!Object} value The object to test.
 * @return {boolean} True if the value is an object, false otherwise.
 */
treesaver.object.isObject = function(value) {
  return Object.prototype.toString.apply(value) === '[object Object]';
};

/**
 * Clone an object by creating a new object and
 * setting its prototype to the original object.
 *
 * @param {!Object} o The object to be cloned.
 * @return {!Object} A clone of the given object.
 */
Object.clone = function(o) {
  /** @constructor */
  function Clone() {}
  Clone.prototype = o;
	return new Clone();
};
