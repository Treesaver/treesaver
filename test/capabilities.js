goog.require('treesaver.capabilities');

$(function() {
  module('capabilities');

  test('checkCapabilities', function() {
    var oldCaps = treesaver.capabilities.caps_,
        oldMutableCaps = treesaver.capabilities.mutableCaps_;

    // Mock out the capabilities arrays for easy testing
    treesaver.capabilities.caps_ = ['flash', 'browser-mac', 'no-fontface'];
    treesaver.capabilities.mutableCaps_ = ['no-offline', 'orientation-horizontal'];

    ok(treesaver.capabilities.check(['flash']), 'Single');
    ok(treesaver.capabilities.check(['no-fontface']), 'Single Negation');
    ok(!treesaver.capabilities.check(['no-flash']), 'False Negation');
    ok(treesaver.capabilities.check(['offline']), 'Test on mutable property');
    ok(treesaver.capabilities.check(['orientation-vertical']), 'Test on mutable property');
    ok(!treesaver.capabilities.check(['bogus']), 'Non-existent requirement');
    ok(treesaver.capabilities.check(['no-bogus']), 'Non-existent negation');

    ok(treesaver.capabilities.check(['orientation-horizontal'], true), 'Successful mutable');
    ok(!treesaver.capabilities.check(['orientation-vertical'], true), 'Failed mutable');

    ok(treesaver.capabilities.check(['orientation-horizontal', 'flash', 'browser-mac', 'no-fontface'], true), 'Kitchen sink');

    // Restore Mocks
    treesaver.capabilities.caps_ = oldCaps;
    treesaver.capabilities.mutableCaps_ = oldMutableCaps;
  });

  test('mutableCapabilityRegex', function () {
    // Make sure the regex catches positive and negative capability names
    ok(treesaver.capabilities.mutableCapabilityRegex_.test('offline'), 'offline');
    // Reset Regex
    treesaver.capabilities.mutableCapabilityRegex_.lastIndex = 0;
    ok(treesaver.capabilities.mutableCapabilityRegex_.test('no-offline'), 'no-offline');
    // Reset Regex
    treesaver.capabilities.mutableCapabilityRegex_.lastIndex = 0;
    ok(treesaver.capabilities.mutableCapabilityRegex_.test('bogus offline'), 'bogus offline');
    // Reset Regex
    treesaver.capabilities.mutableCapabilityRegex_.lastIndex = 0;
    ok(treesaver.capabilities.mutableCapabilityRegex_.test('orientation-horizontal'), 'orientation-horizontal');
  });
});
