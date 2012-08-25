goog.require('treesaver.layout.BreakRecord');

$(function () {
  module('breakrecord', {
    setup: function () {
      // Create an HTML tree for test data
      // Make request synchronously though
      $.ajax({
        async: false,
        url: 'assets/content.html',
        success: function (data) {
          if (data) {
            var $container = $('<div class="testonly column">').appendTo('body');
            $container[0].innerHTML = data;
          }
        }
      });
    },
    teardown: function () {
      $('.testonly').remove();
    }
  });

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
      blocks: [new treesaver.layout.Block($('h1.bad')[0], 20), new treesaver.layout.Block($('h1.bad')[0], 20), new treesaver.layout.Block($('h1.bad')[0], 20), new treesaver.layout.Block($('h1.bad')[0], 20)],
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

		var fwrap = $('<div></div>').appendTo('body');
		fwrap.html('<figure></figure>');
		var f = $('figure', fwrap);
		f.addClass('testonly');
    f.html('<p data-sizes="one">Size one</p>' +
        '<p>Paragraph within figure within container</p>');
    var new_fig = new treesaver.layout.Block(fwrap[0], 20);
		new_fig = new_fig.figures[0];
    // Add an optional figure with a fallback at the end
    content.figures.push(new_fig);
    content.blocks.push(new_fig.fallback);

    ok(br.atEnd(content), 'Optional fallback left');

    // Now make it required
    new_fig.optional = false;
    ok(!br.atEnd(content), 'Required fallback left');
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
