goog.require('treesaver.layout.Grid');
goog.require('treesaver.layout.BreakRecord');

// Run after window loading
$(function () {
  module('grid', {
    setup: function () {
      // Create an HTML tree for test data
      // Make request synchronously though
      $.ajax({
        async: false,
        url: '../assets/grids.html',
        success: function (data) {
          if (data) {
            var $container = $('<div class="testonly grids">').appendTo('body');
            $container.html(data);
          }
        }
      });
    },
    teardown: function () {
      $('.testonly').remove();
    }
  });

  test('grid: Object Construction', function () {
    var empty_grid = new treesaver.layout.Grid($('.grids .empty')[0]),
        classy_grid = new treesaver.layout.Grid($('.grids .classy')[0]),
        fiver_grid = new treesaver.layout.Grid($('.grids .fiver')[0]);

    ok(!!empty_grid, 'Empty grid: Created');
    ok(empty_grid.flexible, 'Empty grid: Default flexible');
    ok(!empty_grid.scoringFlags.nonfirst, 'Empty grid: Default nonfirst');
    ok(!empty_grid.scoringFlags.odd, 'Empty grid: Default odd');
    ok(!empty_grid.scoringFlags.even, 'Empty grid: Default even');
    ok(!empty_grid.pageNumberFlags, 'Empty grid: No page number flags');
    ok(!empty_grid.textHeight, 'Empty grid: Text Height');
    equals(empty_grid.classes.length, 2, 'Empty grid: Class count');
    equals(empty_grid.cols.length, 0, 'Empty grid: Column count');
    equals(empty_grid.containers.length, 0, 'Empty grid: Container count');
    equals(empty_grid.lineHeight, 20, 'LineHeight extraction');

    ok(!classy_grid.flexible, 'Classy grid: Default flexible');
    ok(classy_grid.scoringFlags.odd, 'Classy grid: Default odd');
    ok(classy_grid.scoringFlags.even, 'Classy grid: Default even');
    ok(classy_grid.pageNumberFlags[1], 'Classy grid: Page number flag');
    ok(classy_grid.pageNumberFlags[5], 'Classy grid: Page number flag');

    equals(fiver_grid.containers.length, 5, 'Fiver grid: Container count');
    equals(fiver_grid.cols.length, 5, 'Fiver grid: Column count');
    equals(fiver_grid.textHeight, 1000, 'Fiver grid: textHeight');
    equals(fiver_grid.maxColHeight, 200, 'Fiver: MaxColHeight');
  });

  test('grid: Stretching', function () {
    var $fiver = $('.grids .fiver'),
        fiver_grid = new treesaver.layout.Grid($fiver[0]);

    equals(fiver_grid.stretch(500).textHeight, 2500, 'Fiver: Simple Stretch');
    equals(fiver_grid.maxColHeight, 500, 'Fiver: MaxColHeight');
    equals(fiver_grid.stretch(1000).textHeight, 3000, 'Fiver: Stretch above max');
    equals(fiver_grid.maxColHeight, 600, 'Fiver: MaxColHeight');
    equals(fiver_grid.stretch(100).textHeight, 1000, 'Fiver: Stretch below min');
    equals(fiver_grid.maxColHeight, 200, 'Fiver: MaxColHeight');

    // Add the fixed flag and try again
    $fiver.addClass('fixed');
    fiver_grid = new treesaver.layout.Grid($fiver[0]);
    equals(fiver_grid.stretch(500).textHeight, 1000, 'Fiver: Stretch fixed');
    equals(fiver_grid.maxColHeight, 200, 'Fiver: MaxColHeight');

    // Remove the flag, but add it onto the even columns
    $fiver.removeClass('fixed').find('.column:even').addClass('fixed');
    fiver_grid = new treesaver.layout.Grid($fiver[0]);
    equals(fiver_grid.stretch(500).textHeight, 1600, 'Fiver: Stretch with some fixed columns');
    equals(fiver_grid.maxColHeight, 500, 'Fiver: MaxColHeight');
  });

  test('grid: Container Mapping', function () {
    // Only figures are used from content, can leave the rest empty
    var content = {
      figures: [
        { // Should match first container
          // anchorIndex
          // figureIndex
          // fallback
          optional: true,
          getSize: function(name) { return this.sizes[name]; },
          sizes: {
            one: {}
          }
        },
        { // Should match final container
          optional: true,
          getSize: function(name) { return this.sizes[name]; },
          sizes: {
            five: {}
          }
        },
        { // Can't match any container (uses bogus size)
          optional: true,
          getSize: function(name) { return this.sizes[name]; },
          sizes: {
            bogus: {}
          }
        },
        { // Has multiple sizes, but should give preference to largest
          optional: false,
          getSize: function(name) { return this.sizes[name]; },
          sizes: {
            one: { },
            two: { },
            three: { }
          }
        }
      ]
    },
        fiver_grid = new treesaver.layout.Grid($('.grids .fiver')[0]),
        br = new treesaver.layout.BreakRecord(),
        map = fiver_grid.mapContainers(content, br.clone());

    // First container matches to first figure
    ok(map[0], 'First container matched');
    equals(map[0] && map[0].figureIndex, 0, 'First container figureIndex');
    equals(map[0] && map[0].size, 'one', 'First container size name');

    // Second container matches to fourth figure, largest size for both
    // This isn't ideal, perhaps ...
    ok(map[1], 'Second container matched');
    equals(map[1] && map[1].figureIndex, 3, 'Second container figureIndex');
    equals(map[1] && map[1].size, 'two', 'Second container size name');

    // Third & fourth figures remain unmatched
    ok(!map[2], 'Third container unfilled');
    ok(!map[3], 'Third container unfilled');

    // Fifth container matches second figure, which was delayed
    ok(map[4], 'Last container matched');
    equals(map[4] && map[4].figureIndex, 1, 'Last container figureIndex');
    equals(map[4] && map[4].size, 'five', 'Last container size name');
  });

  test('grid: Best', function () {
  });
});
