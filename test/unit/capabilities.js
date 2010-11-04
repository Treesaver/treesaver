goog.require('treesaver.capabilities');

$(function() {
  module('capabilities');

  test('checkCapabilities', function() {
    var oldCaps = treesaver.capabilities.caps_,
        oldTransientCaps = treesaver.capabilities.transientCaps_;

    // Mock out the capabilities arrays for easy testing
    treesaver.capabilities.caps_ = ['flash', 'browser-mac', 'no-fontface'];
    treesaver.capabilities.transientCaps_ = ['no-offline', 'orientation-horizontal'];

    ok(treesaver.capabilities.check(['flash']), 'Single');
    ok(treesaver.capabilities.check(['no-fontface']), 'Single Negation');
    ok(!treesaver.capabilities.check(['no-flash']), 'False Negation');
    ok(treesaver.capabilities.check(['offline']), 'Test on transient property');
    ok(treesaver.capabilities.check(['orientation-vertical']), 'Test on transient property');
    ok(!treesaver.capabilities.check(['bogus']), 'Non-existent requirement');
    ok(treesaver.capabilities.check(['no-bogus']), 'Non-existent negation');

    ok(treesaver.capabilities.check(['orientation-horizontal'], true), 'Successful transient');
    ok(!treesaver.capabilities.check(['orientation-vertical'], true), 'Failed transient');

    ok(treesaver.capabilities.check(['orientation-horizontal', 'flash', 'browser-mac', 'no-fontface'], true), 'Kitchen sink');

    // Restore Mocks
    treesaver.capabilities.caps_ = oldCaps;
    treesaver.capabilities.transientCaps_ = oldTransientCaps;
  });

  test('transientCapabilityRegex', function () {
    // Make sure the regex catches positive and negative capability names
    ok(treesaver.capabilities.transientCapabilityRegex_.test('offline'), 'offline');
    ok(treesaver.capabilities.transientCapabilityRegex_.test('no-offline'), 'no-offline');
    ok(treesaver.capabilities.transientCapabilityRegex_.test('bogus offline'), 'bogus offline');
    ok(treesaver.capabilities.transientCapabilityRegex_.test('orientation-horizontal'), 'orientation-horizontal');
  });
});
