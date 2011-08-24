goog.require('treesaver.ui.LightBox');

$(function() {
  module('lightbox', {
    setup: function () {
      // Create an HTML tree for test data
      // Make request synchronously though
      $.ajax({
        async: false,
        url: 'assets/chrome.html',
        success: function (data) {
          if (data) {
            var container = document.createElement('div');
            document.body.appendChild(container);
            container.className = 'testonly container';
            container.innerHTML = data;
          }
        }
      });
    },
    teardown: function () {
      $('.testonly').remove();
    }
  });

  test('Construction', function() {
    var lb = new treesaver.ui.LightBox($('.testonly .lightbox')[0]);

    // Sanity check for now, will fill in real tests later
    ok(lb, 'Object created');
    ok(!lb.container, 'Container is not yet extracted');
    ok(lb.fits({ w: Infinity, h: Infinity}), 'Fits');
    ok(lb.meetsRequirements(), 'Requirements');
  });
});
