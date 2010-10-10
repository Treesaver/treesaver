goog.provide('treesaver.ui.toc');

goog.require('treesaver.microdata');

treesaver.ui.toc.getToc = function() {
  var items = treesaver.microdata.getJSONItems();

  return items.map(function(item) {
    var keys = Object.keys(item.properties),
        result = {};
    keys.forEach(function(key) {
      result[key] = item.properties[key][0];
    });
    return result;
  });
};
