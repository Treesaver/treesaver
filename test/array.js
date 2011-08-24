goog.require('treesaver.array');

$(function() {
  module('array', {
    setup: function () {
    },
    teardown: function () {
    }
  });

  test('remove', function () {
    var arr = [1];

    ok('remove' in treesaver.array, 'Function exposed');
    treesaver.array.remove(arr, 0);
    equals(arr.length, 0, 'Only element removed');
  });
});
