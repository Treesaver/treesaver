goog.require('treesaver.layout.FigureSize');

// Run after window loading
$(function () {
  function escapeHTML(str) {
    return $('<div>').text(str).html().toLowerCase();
  }

  module('figuresize', {
    setup: function () {
    },
    teardown: function () {
      $('.testonly').remove();
    }
  });

  test('Construction', function () {
    var fs = new treesaver.layout.FigureSize('HTML Content', '100', 200, ['flash']);

    ok(fs, 'Object constructed');
    equals(fs.html, 'HTML Content', 'HTML stored');
    equals(fs.minW, 100, 'Width: Parse string');
    equals(fs.minH, 200, 'Height: Number');
    equals(fs.requirements.length, 1, 'Requirements array');
  });

  test('Apply/Revert', function () {
    var fs = new treesaver.layout.FigureSize('HTML Content', '100', 200),
        div = document.createElement('div');

    fs.applySize(div, 'sample_name');
    equals(div.innerHTML, 'HTML Content', 'HTML inserted');
    equals(div.className, 'sample_name', 'class added');

    fs.revertSize(div, 'sample_name')
    equals(div.innerHTML, '', 'HTML reverted');
    equals(div.className, '', 'class removed');
  });
});
