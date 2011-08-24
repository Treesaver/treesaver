goog.require('treesaver.ui.Scrollable');

$(function() {
  module('scrollable');

  test('initDom', function() {
    var dummy = $('<div>textNode<div>Div</div>textNode</div>')[0];

    treesaver.ui.Scrollable.initDom(dummy);
    equals(dummy.childNodes.length, 3, 'Scrollable element dom unchanged');
  });
});
