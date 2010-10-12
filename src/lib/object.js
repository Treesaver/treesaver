goog.provide('treesaver.object');

if (!Object.keys) {
  /**
   * Returns the keys in an object.
   *
   * @param {!Object} o The object to return the keys for.
   * @return {!Array.<string>} An array of the keys.
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

if (!Object.isObject) {
  /**
   * Test whether or not a value is an object.
   *
   * @param {!Object} value The object to test.
   * @return {!boolean} True if the value is an object, false otherwise.
   */
  Object.isObject = function(value) {
    return Object.prototype.toString.apply(value) === '[object Object]';
  };
}
