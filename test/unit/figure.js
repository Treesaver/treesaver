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
        url: '../assets/content.html',
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
    var figureNode = $('.column .doublecontainer figure')[0],
        indices = {
          index: 0,
          figureIndex: 0
        },
        figure;

    // Figure with one script block and a fallback paragraph
    figure = new treesaver.layout.Figure(figureNode, 20, indices);
    // First, make sure that the indices were updated
    equals(indices.figureIndex, 1, 'figureIndex incremented');
    equals(indices.index, 1, 'Index incremented');
    // Check for our size payload
    ok(figure.sizes['one'] && figure.sizes['one'].size, 'Size extraction one');
    equals(escapeHTML(figure.sizes['one'].size.html), escapeHTML('<p>Size one</p>'), 'Size extraction one: HTML');
    // Now, check the fallback
    ok(figure.fallback, 'Fallback extraction');
    equals(escapeHTML($(figure.fallback.html).text()), escapeHTML('Paragraph within figure within container'), 'Fallback extraction: HTML');

    // Figure with multiple divs. One has a real requirement, one bogus, and the other has multiple
    // sizes and a fallback
    figureNode = $('.column figure.figuretest')[0];
    figure = new treesaver.layout.Figure(figureNode, 20, indices);
    equals(indices.figureIndex, 2, 'figureIndex incremented');
    equals(indices.index, 4, 'Index incremented three times when fallback has two children');
    if (!treesaver.capabilities.IS_LEGACY) {
      equals(figure.sizes['two'].size.minH, 40, 'minHeight extraction');
      ok(!figure.sizes['two'].size.minW, 'No phantom minWidth extraction');
    }
    ok(!figure.sizes['three'].size.minH, 'No phantom minHeight extraction');
    equals(figure.sizes['three'].size.minW, 100, 'minWidth extraction');

    ok(figure.fallback, 'Fallback constructed when shared payload');
    ok(!$(figure.fallback.html)[0].getAttribute('data-sizes'), 'Fallback HTML strips data-sizes parameter');
    ok(figure.sizes['three'].size === figure.sizes['one'].size, 'Data-requires filtered bogus requirement');
    if (!treesaver.capabilities.IS_LEGACY) {
      ok(figure.sizes['two'].size !== figure.sizes['one'].size, 'Data-requires success on no legacy');
    }
    else {
      ok(figure.sizes['two'].size === figure.sizes['one'].size, 'Data-requires failure on no legacy');
    }

    // A figure without a fallback, and with tempalted payloads
    figureNode = $('.column figure.nofallback')[0];
    figure = new treesaver.layout.Figure(figureNode, 20, indices);
    equals(indices.figureIndex, 3, 'No fallback: figureIndex incremented');
    equals(indices.index, 4, 'No fallback: Index not incremented');
    ok(!figure.fallback, 'No fallback: Fallback not generated');
    ok(figure.sizes['three'], 'No fallback: Templated size generated (three)');
    equals(escapeHTML(figure.sizes['three'].size.html), escapeHTML('<p>Templated: 3</p>'), 'Templated applied correctly');
    ok(figure.sizes['four'], 'No fallback: Templated size generated (four)');
    equals(figure.sizes['four'].size.minH, 300, 'No fallback: MinHeight extraction');
  });

  test('Figure - applyTemplate', function () {
    var value = {
      one: '1',
      two: 2
    },
        template = "<a>{{ one }}</a><em>{{ TwO }}</em><strong>{{ bogus }}</strong>",
        result = treesaver.layout.Figure.applyTemplate(template, value),
        $result = $(result);

    ok(result, 'String returned from templating');
    equals($result.length, 3, 'Elements preserved');
    equals(escapeHTML(result), escapeHTML('<a>1</a><em>2</em><strong></strong>'), 'HTML output');
  });

  test('Figure - Templated', function () {
  });
});
