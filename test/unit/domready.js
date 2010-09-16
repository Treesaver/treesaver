goog.require('treesaver.domready');

$(function () {
  module('domready', {
    setup: function () {
    },
    teardown: function () {
    }
  });

  test('domready', function () {
    expect(4);
    stop (2000);

    ok(play.waitForDomReady, "Library exposed");
    play.waitForDomReady(function () {
      ok(true, 'First callback');
      play.waitForDomReady(function () {
        ok(true, 'Nested callback');
        start();
      });
    });
    play.waitForDomReady(function () {
      ok(true, 'Second callback');
    });
  });
});
