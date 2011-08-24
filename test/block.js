goog.require('treesaver.layout.Block');

// Run after window loading
$(function () {
  module('block', {
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

  test('hasBlockChildren', function () {
    var $col = $('.column');

    ok(!treesaver.layout.Block.hasBlockChildren($col.find('h1:first')[0]), 'h1: Text & inline node');
    ok(!treesaver.layout.Block.hasBlockChildren($col.find('p:first')[0]), 'p: Text & br');
    ok(treesaver.layout.Block.hasBlockChildren($col.find('div:first')[0]), 'div');
    ok(treesaver.layout.Block.hasBlockChildren($col.find('ul:first')[0]), 'ul');
    ok(treesaver.layout.Block.hasBlockChildren($col.find('div.transparent')[0]), 'div.transparent');
  });

  test('normalizeMetrics_ - Line height', function () {
    var $h1 = $('.column').find('h1').not('.bad'),
        $h1bad = $('.column').find('h1.bad'),
        $p = $('.column').find('p').not('.bad').first(),
        $pbad = $('.column').find('p.bad');

    treesaver.layout.Block.normalizeMetrics_($h1[0], 20);
    treesaver.layout.Block.normalizeMetrics_($h1bad[0], 20);
    treesaver.layout.Block.normalizeMetrics_($p[0], 20);
    treesaver.layout.Block.normalizeMetrics_($pbad[0], 20);

    equals(parseInt($h1.css('line-height'), 10), 40, 'Header');
    equals(parseInt($h1bad.css('line-height'), 10), 40, 'Bad header');
    equals(parseInt($p.css('line-height'), 10), 20, 'Paragraph');
    equals(parseInt($pbad.css('line-height'), 10), 20, 'Bad paragraph');
  });

  test('normalizeMetrics_ - Margins', function () {
    var $h1 = $('.column').find('h1').not('.bad'),
        $h1bad = $('.column').find('h1.bad'),
        $p = $('.column').find('p').not('.bad').first(),
        $pbad = $('.column').find('p.bad'),
        $ul = $('.column').find('ul').first(),
        $contained = $('.column').find('div.contained'),
        $contained_para = $contained.children().filter('p').first();

    treesaver.layout.Block.normalizeMetrics_($h1[0], 20);
    treesaver.layout.Block.normalizeMetrics_($h1bad[0], 20);
    treesaver.layout.Block.normalizeMetrics_($p[0], 20);
    treesaver.layout.Block.normalizeMetrics_($pbad[0], 20);
    $ul.children().each(function () {
      treesaver.layout.Block.normalizeMetrics_(this, 20);
    });
    treesaver.layout.Block.normalizeMetrics_($ul[0], 20);
    treesaver.layout.Block.normalizeMetrics_($contained[0], 20);
    treesaver.layout.Block.normalizeMetrics_($contained_para[0], 20);

    equals(parseInt($h1.css('margin-top'), 10), 0, 'Header: Top margin');
    equals(parseInt($h1bad.css('margin-top'), 10), 20, 'Bad header: Top margin');
    equals(parseInt($p.css('margin-top'), 10), 0, 'Paragraph: Top margin');
    equals(parseInt($pbad.css('margin-top'), 10), 20, 'Bad paragraph: Top margin');
    equals(parseInt($ul.css('margin-top'), 10), 0, 'List root top margin: Top margin');
    equals(parseInt($ul.css('margin-bottom'), 10), 40, 'List root bottom margin');
    equals(parseInt($ul.children().first().css('margin-top'), 10), 20, 'List first child top margin');
    equals(parseInt($ul.children().last().css('margin-top'), 10), 20, 'List last child top margin');
    equals(parseInt($ul.children().last().css('margin-bottom'), 10), 20, 'List last child bottom margin');
    equals(parseInt($contained.css('margin-top'), 10) || 0, 0, 'Contained Top Margin');
    equals(parseInt($contained.css('margin-bottom'), 10), 20, 'Contained Bottom Margin');
    equals(parseInt($contained_para.css('margin-top'), 10), 20, 'Contained Paragraph Top Margin');
    equals(parseInt($contained_para.css('margin-bottom'), 10), 0, 'Contained Paragraph Bottom Margin');
  });

  test('normalizeMetrics_ - Border & padding', function () {
    var $h1 = $('.column').find('h1').not('.bad'),
        $h1bad = $('.column').find('h1.bad'),
        $p = $('.column').find('p').not('.bad').first(),
        $pbad = $('.column').find('p.bad');

    treesaver.layout.Block.normalizeMetrics_($h1[0], 20);
    treesaver.layout.Block.normalizeMetrics_($h1bad[0], 20);
    treesaver.layout.Block.normalizeMetrics_($p[0], 20);
    treesaver.layout.Block.normalizeMetrics_($pbad[0], 20);

    equals(parseInt($h1.css('padding-top'), 10), 19, 'Header');
    equals(parseInt($h1.css('border-top-width'), 10), 1, 'Header');
    equals(parseInt($h1bad.css('padding-top'), 10), 38, 'Bad header');
    equals(parseInt($h1bad.css('border-top-width'), 10), 2, 'Bad header');
    equals(parseInt($h1bad.css('padding-bottom'), 10), 38, 'Bad header padding-bottom');
    equals(parseInt($h1bad.css('border-bottom-width'), 10), 2, 'Bad header border-bottom');
    equals(parseInt($p.css('padding-top'), 10), 0, 'Paragraph');
    equals(parseInt($p.css('border-top-width'), 10) || 0, 0, 'Paragraph');
    equals(parseInt($pbad.css('padding-top'), 10), 15, 'Bad paragraph');
    equals(parseInt($pbad.css('border-top-width'), 10), 5, 'Bad paragraph');
    equals(parseInt($pbad.css('padding-bottom'), 10), 0, 'Bad paragraph');
    equals(parseInt($pbad.css('border-bottom-width'), 10), 20, 'Bad paragraph');
  });

  test('normalizeMetrics_ - Replaced Elements', function () {
    var $canvas = $('.column').find('canvas'),
        $video = $('.column').find('video'),
        $keeptogther = $('.column').find('p.keeptogether.abnormal').first();

    treesaver.layout.Block.normalizeMetrics_($canvas[0], 20);
    treesaver.layout.Block.normalizeMetrics_($video[0], 20);
    treesaver.layout.Block.normalizeMetrics_($keeptogther[0], 20);

    equals(parseInt($canvas.css('padding-bottom'), 10), 13, 'Canvas');
    equals(parseInt($video.css('padding-bottom'), 10), 18, 'Video');
    equals(parseInt($keeptogther.css('padding-bottom'), 10), 5, 'Keeptogether');
  });

  test('sanitizeNode - textNode removal', function () {
    var $h1 = $('.column').find('h1').not('.bad'),
        $doublecontainer = $('.column').find('.doublecontainer'),
        hasTextNode = function (el) {
          var i, len, node;
          for (i = 0, len = el.childNodes.length; i < len; i += 1) {
            node = el.childNodes[i];
            if (node.nodeType !== 1) {
              return true;
            }
          }
          return false;
        };

    treesaver.layout.Block.sanitizeNode($h1[0], 20);
    treesaver.layout.Block.sanitizeNode($doublecontainer[0], 20);

    ok(hasTextNode($h1[0]), 'h1 has textNodes');
    ok(!hasTextNode($doublecontainer[0]), 'div.doublecontainer has no textNodes');
    ok(!hasTextNode($doublecontainer.children()[0]), 'doublecontainer div child has no textNodes');
    ok(hasTextNode($doublecontainer.find('p')[0]), 'Nested paragraph still has textNodes');
  });

  test('figure extraction - Node removal and Object construction', function () {
    // Sanitize
    treesaver.layout.Block.sanitizeNode($('.column.testonly')[0], 20);

    var doublecontainer = new treesaver.layout.Block($('.column.testonly .doublecontainer')[0], 20),
        figure;

    equals($(doublecontainer.html).find('figure').length, 0, 'Figure nodes not in block html');
    ok(doublecontainer.figures.length, 'Figure object constructed');
    figure = doublecontainer.figures[0];
    ok(figure.sizes['one'], 'Figure size extracted');
    ok(figure.fallback, 'Fallback block created');
    ok(doublecontainer.blocks[0].blocks[0] === figure.fallback, 'Fallback placed into blocks array');
    ok(doublecontainer.containsFallback, 'containsFallback flag set on grandparent');
    ok(doublecontainer.blocks[0].containsFallback, 'containsFallback flag set on parent');
    ok(!doublecontainer.blocks[0].blocks[0].containsFallback, 'containsFallback flag not set on peer');
  });

  test('construction - Find all child blocks', function () {
    // Always sanitize first
    treesaver.layout.Block.sanitizeNode($('.column')[0], 20);

    var supernested_block = new treesaver.layout.Block($('.column .supernested')[0], 20);

    equals(supernested_block.blocks.length, 7, 'Supernesting');
    equals(supernested_block.blocks[0].blocks.length, 6, 'Supernesting');
  });

  test('construction - Supernesting', function () {
    // Always sanitize first
    treesaver.layout.Block.sanitizeNode($('.column')[0], 20);

    var supernested_block = new treesaver.layout.Block($('.column .annoying-nesting:first')[0], 20),
        $el;

    // Make sure we're getting the right metrics
    equals(supernested_block.blocks.length, 4, 'Child blocks found');
    equals(supernested_block.metrics.paddingTop, 20, 'First level padding top');
    equals(supernested_block.blocks[0].metrics.paddingTop, 20, 'Second level padding top');
    equals(supernested_block.blocks[1].metrics.paddingTop, 20, 'Third level padding top');

    function getPaddingTop(html) {
      return $(html).addClass('testonly').appendTo('body').css('padding-top');
    }

    // Now make sure that our HTML matches the metrics
    equals(getPaddingTop(supernested_block.html), '20px', 'HTMLElement: First level padding top');
    equals(getPaddingTop(supernested_block.blocks[0].html), '20px', 'HTMLElement: Second level padding top');
    equals(getPaddingTop(supernested_block.blocks[1].html), '20px', 'HTMLElement: Third level padding top');

    // Now, let's test the rolled up HTML
    $el = $(supernested_block.html).addClass('testonly').appendTo('body');
    equals($el.css('padding-top'), '20px', 'Rolled up HTMLElement: First level padding top');
    equals($el.find('*').eq(0).css('padding-top'), '20px', 'Rolled up HTMLElement: Second level padding top');
    equals($el.find('*').eq(1).css('padding-top'), '20px', 'Rolled up HTMLElement: Third level padding top');

    // Go down a level and do the same
    $el = $(supernested_block.blocks[0].html).addClass('testonly').appendTo('body');
    equals($el.css('padding-top'), '20px', 'Second Rolled up HTMLElement: First level padding top');
    equals($el.find('*').eq(0).css('padding-top'), '20px', 'Second Rolled up HTMLElement: Second level padding top');

    // One last level
    $el = $(supernested_block.blocks[1].html).addClass('testonly').appendTo('body');
    equals($el.css('padding-top'), '20px', 'Third Rolled up HTMLElement: First level padding top');
  });

  test('firstLine', function () {
    // Sanitize the nodes first
    treesaver.layout.Block.sanitizeNode($('.column')[0], 20);

    var ul = new treesaver.layout.Block($('ul:first')[0], 20),
        h1bad = new treesaver.layout.Block($('h1.bad')[0], 20),
        pbad = new treesaver.layout.Block($('.column').find('p.bad')[0]),
        superNested = new treesaver.layout.Block($('.supernested')[0], 20);

    equals(ul.firstLine, 20, 'UL firstline');
    // Fits on one line, so is kept together. 40px line height and 40px top bp and 40px bottom bp
    equals(h1bad.firstLine, 120, 'h1Bad firstline');
    // Line height and top border/padding
    equals(pbad.firstLine, 40, 'pBad firstline');
    // 40px line height propagates up
    equals(superNested.firstLine, 40, 'super nested firstline');
  });

  test('openAllTags/closeAllTags', function () {
    // Sanitize the nodes first
    treesaver.layout.Block.sanitizeNode($('.column')[0], 20);

    var h1bad = new treesaver.layout.Block($('h1.bad')[0], 20),
        ul = new treesaver.layout.Block($('ul:first')[0], 20),
        li = ul.blocks[0],
        superNested = new treesaver.layout.Block($('.supernested')[0], 20),
        superNestedP = superNested.blocks[3];

    function escapeHTML(html) {
      return $("<div />").text(html).html().toLowerCase();
    }

    equals(escapeHTML(h1bad.openAllTags()), escapeHTML(''), 'Open: Block without parent');
    equals(escapeHTML(h1bad.closeAllTags()), escapeHTML(''), 'Close: Block without parent');
    equals(escapeHTML(li.openAllTags()), escapeHTML(ul.openTag), 'Single-parent list item');
    equals(escapeHTML(li.openAllTags(true)), escapeHTML(ul.openTag_zero), 'Single-parent list item zero');
    equals(escapeHTML(li.closeAllTags()), escapeHTML('</ul>'), 'Close: Single-parent list item');
    // DEBUG mode attaches meta data to the tags, so we can't just compare HTML
    // Instead, create the DOM object, and count the number of divs
    equals($(superNestedP.openAllTags()).find('*').andSelf().length, 4, 'Super-nested paragraph non-zero, element count');
    equals(escapeHTML(superNestedP.closeAllTags()), escapeHTML('</div></div></div></div>'), 'Close: Super-nested paragraph non-zero');
  });

  test('totalBpBottom', function () {
    // Sanitize the nodes first
    treesaver.layout.Block.sanitizeNode($('.column')[0], 20);

    // TODO: write tests
  });

  test('list numbering', function () {
    // Create a temporary dom
    var $list = $('<ol></ol>').addClass('testonly').appendTo('body'),
        i, html, block;

    // Add list items
    for (i = 0; i < 10; i += 1) {
      $list.append('<li>' + i + '</li>');
    }

    $list.find('li')[6].setAttribute('value', 10);

    // Sanitize
    treesaver.layout.Block.sanitizeNode($('.column')[0], 20);

    // Save out the HTML so we can re-use it later
    listNode = $list[0].cloneNode(true);

    // Process the block
    block = new treesaver.layout.Block($list[0], 20);
    $list = $(block.html);

    equals($list[0].childNodes[0].value, 1, 'Standard indexed value');
    equals($list[0].childNodes[3].value, 4, 'Standard indexed value');
    equals($list[0].childNodes[6].value, 10, 'Manual value preserved');
    equals($list[0].childNodes[7].value, 11, 'Correct increment after manual value');

    // Use a new list with a start value
    $list = $(listNode).addClass('testonly').appendTo('body');
    $list.attr('start', 10);
    // Process the block
    block = new treesaver.layout.Block($list[0], 20);
    $list = $(block.html);

    equals($list[0].childNodes[0].value, 10, 'Start value used');
    equals($list[0].childNodes[2].value, 12, 'Start value incremented correctly');
  });
});
