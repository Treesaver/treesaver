goog.require('treesaver.layout.ContentPosition');

$(function () {
  module('contentposition');

  test('Object Construction', function() {
    var cp = new treesaver.layout.ContentPosition(1, 2, 3);

    ok(cp, 'Object created');
    equals(cp.block, 1, 'Block index stored');
    equals(cp.figure, 2, 'Figure index stored');
    equals(cp.overhang, 3, 'Overhang stored');
  });

  test('Comparison Operators', function() {
    var cp1 = new treesaver.layout.ContentPosition(0, 0, 0),
        cp2 = cp1.clone();

    ok(cp1.lessOrEqual(cp2), 'lessOrEqual: Equal');
    cp2.block = 1;
    ok(cp1.lessOrEqual(cp2), 'lessOrEqual: Block index');
    cp2.block = 0; cp2.figure = 1;
    ok(cp1.lessOrEqual(cp2), 'lessOrEqual: Figure index');
    cp2.figure = 0; cp1.overhang = 1;
    ok(cp1.lessOrEqual(cp2), 'lessOrEqual: Overhang');
    cp1.overhang = 0;

    cp1.figure = 5; cp2.block = 1;
    ok(cp2.greater(cp1), 'Block position takes precedence over figure position');
  });
});
