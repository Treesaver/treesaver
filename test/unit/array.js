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

    ok('remove' in arr, 'Function exposed');
    arr.remove(0);
    equals(arr.length, 0, 'Only element removed');
  });
});
