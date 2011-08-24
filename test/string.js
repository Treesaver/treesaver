goog.require('treesaver.string');

$(function() {
  module('string');

  test('trim', function() {
    var str = '   hello   ';

    ok('trim' in String.prototype, 'Function exposed');
    equals(str.trim(), 'hello', 'Sanity check');
  });
});
