goog.require('treesaver.layout.Content');

// Run after window loading
$(function () {
  module('content', {
    setup: function () {
    },
    teardown: function () {
    }
  });

  test('grid: lineHeight', function () {
    var e = $('<p></p>').addClass('testonly').appendTo('body').css({
          fontSize: '14px',
          lineHeight: '1.45em'
        }),
        p = new treesaver.layout.Content(e[0]);

    equals(p.lineHeight, treesaver.capabilities.SUPPORTS_SUBPIXELS? 21: 20, 'lineHeight is rounded correctly');
  });
});
