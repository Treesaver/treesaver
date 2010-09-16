goog.require('treesaver.layout.BreakRecord');

$(function () {
  module('breakrecord');

  test('Equality check', function () {
    var br1 = new treesaver.layout.BreakRecord(),
        br2 = new treesaver.layout.BreakRecord();

    ok(br1.equals(br2), 'Virgin break records');

    br2.index += 1;
    ok(!br1.equals(br2), 'Index change');
  });

  test('Cloning', function () {
    var br1 = new treesaver.layout.BreakRecord(),
        br2 = br1.clone();

    ok(br1.equals(br2), 'Equality after cloning');
    br1.delayed.push(1);
    ok(br1.delayed.length !== br2.delayed.length, 'Array lengths differ');
    ok(br1.delayed !== br2.delayed, 'Arrays differ');
  });

  test('atStart', function () {
    var br = new treesaver.layout.BreakRecord();

    ok(br.atStart(), 'Virgin');
    br.overhang = 1;
    ok(!br.atStart(), 'With overhang');

    br = new treesaver.layout.BreakRecord();
    br.index = 1;
    ok(!br.atStart(), 'With index');

    br = new treesaver.layout.BreakRecord();
    br.figureIndex = 1;
    ok(!br.atStart(), 'With figureIndex');
  });

  test('atEnd', function () {
    var br = new treesaver.layout.BreakRecord(),
        content = {
      // Doesn't really matter what's in blocks array,
      // as long as something is in there
      blocks: [0, 1, 2, 3],
      // Figures just need to indicate whether they are
      // required
      figures: []
    };

    ok(!br.atEnd(content), 'Virgin breakRecord');
    br.index = 4;
    ok(br.atEnd(content), 'Blocks done, no figures at all');

    // Now add some figures
    content.figures = [
      { optional: true }
    ]
    ok(br.atEnd(content), 'Blocks done, optional figure');

    // Add a required figure at the beginning
    content.figures.unshift({ optional: false });
    ok(!br.atEnd(content), 'Blocks done, one required figure');

    // Make the required one be delayed
    br.useFigure(1);
    ok(br.delayed.length, 'Figure indeed delayed');
    ok(!br.atEnd(content), 'Blocks done, one delayed required figure');

    // Now use the required figure
    br.useFigure(0);
    ok(br.atEnd(content), 'Blocks done, figures done');
  });

  test('useFigure', function () {
    var br = new treesaver.layout.BreakRecord();

    br.useFigure(0);
    equals(br.figureIndex, 1, 'Advance by one on virgin');

    br.useFigure(10);
    equals(br.figureIndex, 11, 'Advance by many: figureIndex');
    equals(br.delayed.length, 9, 'Advance by many: delayed.length');

    br.useFigure(5);
    equals(br.figureIndex, 11, 'Use delayed: figureIndex');
    equals(br.delayed.length, 8, 'Use delayed: delayed.length');
  });

  test('failedFigure', function () {
    var br = new treesaver.layout.BreakRecord();

    br.failedFigure(10);
    ok(br.failed.indexOf(10) !== -1, 'Failed figure stored');
    br.useFigure(10);
    ok(br.failed.indexOf(10) === -1, 'Failed figure removed after use');
  });

  test('figureUsed', function () {
    var br = new treesaver.layout.BreakRecord();

    ok(!br.figureUsed(0), 'Virgin ahead of figureIndex');

    br.figureIndex = 4;
    ok(br.figureUsed(1), 'Behind figureIndex');
    ok(!br.figureUsed(5), 'Ahead figureIndex');

    // Cause a failure
    br.failedFigure(10);
    ok(!br.figureUsed(10), 'Failed figure not marked as used');
    br.useFigure(10);
    ok(br.figureUsed(10), 'Failed figure used');
  });
});
