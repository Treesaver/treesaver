goog.require('treesaver.layout.Figure');
goog.require('treesaver.capabilities');

// Run after window loading
$(function () {
  function escapeHTML(str) {
    return $('<div>').text(str).html().toLowerCase();
  }

  module('figure', {
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

  test('Figure - Construction', function () {
    var indices = {
          index: 0,
          figureIndex: 0
        },
        figure,
        f = $('<figure></figure>').addClass('testonly').appendTo('body');

    // TODO: split these out into separate tests
    f.html('<p data-sizes="one">Size one</p>' +
        '<p>Paragraph within figure within container</p>');

    // Figure with one script block and a fallback paragraph
    figure = new treesaver.layout.Figure(f[0], 20, indices);
    // First, make sure that the indices were updated
    equals(indices.figureIndex, 1, 'figureIndex incremented');
    equals(indices.index, 1, 'Index incremented');

    // Check for our size payload
    ok(figure.sizes['one'], 'Size extraction one');
    equals(escapeHTML($(figure.sizes['one'][0].html).text()), escapeHTML('Size one'), 'Size extraction one: HTML');
    // Now, check the fallback
    ok(figure.fallback, 'Fallback extraction');
    equals(escapeHTML($(figure.fallback.html).text()), escapeHTML('Paragraph within figure within container'), 'Fallback extraction: HTML');
  });

  test('Figure - Construction - Multiple sizes', function() {
    var indices = {
          index: 0,
          figureIndex: 0
        },
        figure,
        f = $('<figure></figure>').addClass('testonly').appendTo('body');

   f.html(
      '<div data-minheight="40" data-requires="no-legacy" data-sizes="two">' +
        '<p>Requires</p>' +
      '</div>' +
      '<div data-requires="bogus" data-sizes="three">' +
        '<p>Bogus</p>' +
      '</div>' +
      '<div data-minwidth="100" data-sizes="one two three fallback">' +
        '<p>All</p><p>sizes</p>' +
      '</div>' +
      '<div data-requires="offline" data-sizes="four">' +
        '<p>Offline-only</p>' +
      '</div>' +
      '<div data-requires="no-offline" data-sizes="four">' +
        '<p>Online-only</p>' +
      '</div>');

    // Figure with multiple divs. One has a real requirement, one bogus, and the other has multiple
    // sizes and a fallback
    figure = new treesaver.layout.Figure(f[0], 20, indices);

    equals(indices.figureIndex, 1, 'figureIndex incremented');
    equals(indices.index, 3, 'Index incremented three times when fallback has two children');
    if (!treesaver.capabilities.IS_LEGACY) {
      equals(figure.sizes['two'][0].minH, 40, 'minHeight extraction');
      ok(!figure.sizes['two'][0].minW, 'No phantom minWidth extraction');
    }
    ok(!figure.sizes['three'][0].minH, 'No phantom minHeight extraction');
    equals(figure.sizes['three'][0].minW, 100, 'minWidth extraction');

    ok(figure.fallback, 'Fallback constructed when shared payload');
    //ok(!$(figure.fallback.html)[0].getAttribute('data-sizes'), 'Fallback HTML strips data-sizes parameter');
    ok(figure.sizes['three'][0] === figure.sizes['one'][0], 'Data-requires filtered bogus requirement');
    if (!treesaver.capabilities.IS_LEGACY) {
      ok(figure.sizes['two'][0] !== figure.sizes['one'][0], 'Data-requires success on no legacy');
    }
    else {
      ok(figure.sizes['two'][0] === figure.sizes['one'][0], 'Data-requires failure on no legacy');
    }
    equals(figure.sizes['four'].length, 2, 'Mutable capability figureSizes preserved');
  });

  test('Figure - Flags', function() {
    var f = document.createElement('figure'),
        figure,
        indices = {
          index: 0,
          figureIndex: 0
        };
        
    figure = new treesaver.layout.Figure(f, 20, indices);

    ok(!figure.zoomable, 'zoomable is not set');
    ok(figure.optional, 'figure is optional');

    treesaver.dom.addClass(f, 'zoomable');

    figure = new treesaver.layout.Figure(f, 20, indices);

    ok(figure.zoomable, 'figure is zoomable');

    treesaver.dom.addClass(f, 'required');

    figure = new treesaver.layout.Figure(f, 20, indices);

    ok(!figure.optional, 'figure is required');
  });

  test('Figure - fallback', function() {
    var f = $('<figure></figure>').addClass('testonly').appendTo('body'),
        figure,
        indices = {
          index: 0,
          figureIndex: 0
        };

    figure = new treesaver.layout.Figure(f[0], 20, indices);
    ok(!figure.fallback, 'No fallback');

    f.html('<p>Fallback</p>');
    figure = new treesaver.layout.Figure(f[0], 20, indices);
    ok(figure.fallback, 'Default fallback');
    equals(escapeHTML($(figure.fallback.html).text()), escapeHTML('Fallback'), 'Default fallback is correct');

    f.html('<p data-sizes="fallback">Data sizes fallback</p>');
    figure = new treesaver.layout.Figure(f[0], 20, indices);
    ok(figure.fallback, 'Data sizes fallback is correctly extracted');
    equals(escapeHTML($(figure.fallback.html).text()), escapeHTML('Data sizes fallback'), 'Data sizes fallback is correct');
  });

  // TODO: Make these tests more betterer
  test('Figure - getSize', function() {
    var indices = {
          index: 0,
          figureIndex: 0
        },
        figureNode = $('.column figure.figuretest')[0],
        figure = new treesaver.layout.Figure(figureNode, 20, indices),
        size,
        caps = [];

    ok(!figure.getSize('bogus'), 'Bogus size returns nothing');
    ok(figure.getSize('one'), 'Real size returns payload');

    // Mock out the capability checking function
    treesaver.capabilities.check_ = treesaver.capabilities.check;
    treesaver.capabilities.check = function (reqs) {
      // Ghetto mock that only checks the first requirement
      return caps.indexOf(reqs[0]) !== -1;
    };

    // Nothing in caps array means all checks will fail
    ok(!figure.getSize('four'), 'Figure sizes filtered by capability');
    // Now let offline figures through
    caps = ['offline'];
    ok(figure.getSize('four'), 'Figure sizes filtered by capability');
    // Store the offline figure, and change caps to get online, confirm they
    // are different
    size = figure.getSize('four');
    caps = ['no-offline'];
    ok(figure.getSize('four') !== size, 'Figure sizes filtered by capability');

    // Restore non-mocked function
    treesaver.capabilities.check = treesaver.capabilities.check_;
    delete treesaver.capabilities.check_;
  });
});
