goog.require('treesaver.layout.Column');

$(function() {
  module('column');

  test('Construction & stretching', function () {
    var colNode = document.createElement('div'),
        col;

    document.body.appendChild(colNode);
    colNode.style.height = "550px";
    colNode.style.minHeight = "200px";
    colNode.className = "column fixed col-1";

    col = new treesaver.layout.Column(colNode, 800);

    ok(col, 'Object constructed');
    ok(!col.flexible, 'Fixed flag detected');
    equals(col.h, 550, 'Height computed');
    equals(col.w, 200, 'Width computed');
    equals(col.minH, 200, 'Height computed');
    equals(col.delta, 250, 'Computed delta');

    col.stretch(1000);
    equals(col.h, 550, 'Fixed column does not stretch');

    col.flexible = true;

    col.stretch(1000);
    equals(col.h, 750, 'Flexible column stretches');

    document.body.removeChild(colNode);
  });
});
