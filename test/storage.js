goog.require('treesaver.storage');

$(function() {
  module('storage', {
    setup: function () {
    },
    teardown: function () {
    }
  });

  test('setting/getting', function () {
    ok('storage' in treesaver, 'Library exposed');

    treesaver.storage.set('test', 'value');
    equals(treesaver.storage.get('test'), 'value', 'Simple set and get');
  });
});
