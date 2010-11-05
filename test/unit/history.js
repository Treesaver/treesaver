goog.require('treesaver.history');

module('history', {
  setup: function() {
    // Save original function in case of mocking
    treesaver.history.originalHashChange_ = treesaver.history.hashChange_;
  },
  teardown: function() {
    // Restore Mock
    treesaver.history.hashChange_ = treesaver.history.originalHashChange_;

    // Clear out the hash
    location.hash = '#';
  }
});

test('getNormalizedHash_', function() {
  equals(treesaver.history.getNormalizedHash_(), '', 'Initial: No hash');
  // Add an empty hash
  location.hash = "#"
  equals(treesaver.history.getNormalizedHash_(), '', 'Empty hash');

  // Simple hash
  location.hash = "#sample_hash";
  equals(treesaver.history.getNormalizedHash_(), 'sample_hash', 'Simple hash');

  // TODO: Test with location.search? Changing it in JS will cause a reload though
});

// Only run tests if non-native support
if ('pushState' in window.history) {
  test('pushState/replaceState', function() {
    ok(true, 'Native History API');
  });
}
else {
  test('Hash Change Detection', function() {
    if ('onhashchange' in window && !treesaver.capabilities.IS_IE8INIE7) {
      ok(true, 'Native onhashchange');
      return;
    }

    // Clear any hash
    location.hash = '#';

    // Mock out the real hashChange_ helper function
    var hashes = ['one', 'two', 'three'];

    treesaver.history.hashChange_ = function() {
      // Call original
      treesaver.history.originalHashChange_();

      var current_hash = treesaver.history.getNormalizedHash_(),
          expected_hash = hashes.shift();

      ok(true, 'Hash changed received: ' + current_hash);
      equals(current_hash, expected_hash);

      // Are there any hashes left?
      if (hashes[0]) {
        // Trigger the next hash change
        treesaver.history.setLocationHash_(hashes[0]);
      }
      else {
        // Restore a blank hash
        treesaver.history.setLocationHash_('');
        start();
      }
    };

    expect(6);
    stop(2000);

    treesaver.history.setLocationHash_(hashes[0]);
  });

  test('Hash Changed on back button', function() {
    if ('onhashchange' in window && !treesaver.capabilities.IS_IE8INIE7) {
      ok(true, 'Native onhashchange');
      return;
    }

    // First, set the hash manually a few times
    treesaver.history.setLocationHash_('test-one');
    treesaver.history.setLocationHash_('test-two');
    treesaver.history.setLocationHash_('test-three');

    treesaver.history.hashChange_ = function() {
      // Call original
      treesaver.history.originalHashChange_();

      ok(true, 'Hash changed on back button');

      treesaver.history.hashChange_ = function() {
        // Call original
        treesaver.history.originalHashChange_();

        ok(true, 'Hash changed on second back button');
        start();
      };

      window.history.back();
    };

    stop(2000);
    expect(2);
    window.history.back();
  });
}
