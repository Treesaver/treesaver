goog.require('treesaver.layout.Page');

goog.require('treesaver.dom');
goog.require('treesaver.layout.BreakRecord');
goog.require('treesaver.layout.Block');
goog.require('treesaver.layout.Figure');
goog.require('treesaver.layout.FigureSize');

// Run after window loading
$(function () {
  module('page', {
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
      // Fetch the content as well
      $.ajax({
        async: false,
        url: '../assets/content.html',
        success: function (data) {
          if (data) {
            var $container = $('<div class="testonly column content">').appendTo('body');
            $container.html(data);
          }
        }
      });

      treesaver.layout.Block.normalizeMetrics_($('.content.column')[0], 20);
      treesaver.layout.Block.sanitizeNode($('.content.column')[0], 20);
    },
    teardown: function () {
      $('.testonly').remove();
    }
  });

  // TODO: fillContainers
  test('fillContainer - Basics', function () {
    var $page = $('<div class="page fillContainer testonly"></div>').css({ height: 1000, position: 'relative'}).appendTo('body'),
        $container = $('<div class="container testonly"></div>').appendTo($page).css({ top: 0, bottom: 0 }),
        figure = {
          sizes: {
            bogus: {
              applySize: function () { },
              revertSize: function () { }
            }
          }
        },
        map = {
          size: 'size',
          figureSize: new treesaver.layout.FigureSize(treesaver.dom.outerHTML($('<div />').height(200)[0])),
          flexible: true
        },
        success;

    // Our first case is quite simple, there's plenty of space in the
    // content, we just have to put the html in there
    success = treesaver.layout.Page.fillContainer($container[0], figure, map);
    ok(success, 'Basic: Success');
    ok($container.hasClass('size'), 'Basic: Class added to container');
    equals($container.height(), '200', 'Basic: Height reduced to tight');
    equals($container.children().length, 1, 'Basic: Child inserted');

    // Make sure fixed containers aren't resized
    $container.removeClass('matched size').html('').css({ height: 'auto', bottom: 0 });
    map.flexible = false;
    success = treesaver.layout.Page.fillContainer($container[0], figure, map);
    ok(success, 'Basic fixed: Success');
    equals($container.children().length, 1, 'Basic fixed: Child inserted');
    equals($container.height(), 1000, 'Basic fixed: Height preserved');

    // For fixed containers, shove the image in there even if it doesn't fit
    $container.removeClass('matched size').html('').height(100);
    success = treesaver.layout.Page.fillContainer($container[0], figure, map);
    ok(success, 'Basic fixed w/o space: Success');
    equals($container.children().length, 1, 'Basic fixed w/o space: Child inserted');
    equals($container.height(), '100', 'Basic fixed w/o space: Height preserved');

    // Flex containers won't accept a too-large figure
    $container.removeClass('matched size').html('').css({
      height: 'auto',
      bottom: 900
    });
    map.flexible = true;
    success = treesaver.layout.Page.fillContainer($container[0], figure, map);
    ok(!success, 'Basic w/o space: Failure');
    ok(!$container.hasClass('size'), 'Basic w/o space: Class removed from container');
    equals($container.children().length, 0, 'Basic w/o space: Child not inserted');
    //equals($container.height(), '100', 'Basic w/o space: Height preserved');
  });

  test('fillContainer - Column flexing', function () {
    var $page = $('<div class="page fillContainer testonly"></div>')
                  .height(1000).css('position', 'relative').appendTo('body'),
        $container = $('<div class="container testonly"></div>').appendTo($page).height(400),
        figure = {
          sizes: {
            size: new treesaver.layout.FigureSize(treesaver.dom.outerHTML($('<div />').height(200)[0]))
          }
        },
        map = {
          size: 'size',
          figureSize: new treesaver.layout.FigureSize(treesaver.dom.outerHTML($('<div />').height(200)[0])),
          flexible: true
        },
        success,
        $col;

    // Add a single column into the page, and make sure it gets flexed correctly
    $col = $('<div class="column"></div>').css({
      position: 'absolute',
      top: '0',
      bottom: '0'
    }).appendTo($page);
    // Add a fixed column, that will get ignored when it comes to flexing
    $col = $('<div class="column fixed"></div>').css({
      position: 'absolute',
      top: '0',
      bottom: '0'
    }).appendTo($page);

    // First, sanity check to make sure a fixed container won't flex columns
    map.flexible = false;
    success = treesaver.layout.Page.fillContainer($container[0], figure, map);
    ok(success, 'Fixed container: Filling success');
    equals($container.height(), 400, 'Fixed container: Height preserved');
    equals($page.find('.column.flexed').length, 0, 'Fixed container: No flexed columns found');
    equals($page.find('.column').height(), 1000, 'Fixed container: Column still at full height');

    // OK, now make the container flexible and try again
    map.flexible = true;
    $container.html('').removeClass('matched size').css({ height: 'auto', bottom: 600 });
    $page.find('.column').removeClass('flexed').css({ top: 0, bottom: 0, height: 'auto' });

    // Containers are anchored to the top by default, so this will push all the columns down
    success = treesaver.layout.Page.fillContainer($container[0], figure, map);
    ok(success, 'Flex container: Filling success');
    equals($page.find('.column.flexed').length, 1, 'Flex container: One flexed column found');
    equals($page.find('.column.fixed').length, 1, 'Flex container: One fixed column found');
    equals($page.find('.column.flexed')[0].offsetTop, 200, 'Flex container: Column top pushed down');
    equals($page.find('.column.flexed').height(), 800, 'Flex container: Column reduced height');
    equals($page.find('.column.fixed').height(), 1000, 'Flex container: Fixed Column at full height');

    // Make sure we know how to deal with column anchoring (top v. bottom), this time let's have
    // the container anchored to the bottom
    $container.html('').removeClass('matched size').addClass('bottom').css({ height: 'auto', bottom: 600 });
    $page.find('.column').removeClass('fixed flexed').css({ top: 0, bottom: 0, height: 'auto' });

    success = treesaver.layout.Page.fillContainer($container[0], figure, map);
    ok(success, 'Bottom-anchored container: Filling success');
    equals($page.find('.column')[0].offsetTop, 0, 'Bottom-anchored container: Column top stays put');
    equals($page.find('.column.flexed').height(), 800, 'Bottom-anchored container: Column reduced height');

    // If the container is really big, we can end up taking up all the space, test that
    $container.html('').removeClass('matched size').addClass('bottom').height(1000);
    $page.find('.column').removeClass('fixed flexed').css({ top: 0, bottom: 0, height: 'auto' });
    figure.sizes.size.html = treesaver.dom.outerHTML($(figure.sizes.size.html).height(1000)[0]);

    success = treesaver.layout.Page.fillContainer($container[0], figure, map);
    ok(success, 'Full-height container: Filling success');
    equals($page.find('.column').height(), 0, 'Full-height container: Column goes to zero height');
  });

  test('fillContainer - Stacking', function () {
    var $page = $('<div class="page fillContainer testonly"></div>')
                  .height(1000).css('position', 'relative').appendTo('body'),
        $top_container = $('<div class="container testonly"></div>').css({
          position: 'absolute',
          top: 0,
          bottom: 0
        }).appendTo($page),
        $bottom_container = $('<div class="container bottom testonly"></div>').css({
          position: 'absolute',
          top: 0,
          bottom: 0
        }).appendTo($page),
        figure = {
          sizes: {
          }
        },
        map = {
          size: 'size',
          figureSize: new treesaver.layout.FigureSize(treesaver.dom.outerHTML($('<div />').height(200)[0])),
          flexible: true
        },
        $col;

    // We have a page with two containers (and no columns right now). One container is top,
    // the other is on the bottom.
    //
    // First, go ahead and fill both containers, checking to make sure things happen as
    // expected
    ok(treesaver.layout.Page.fillContainer($top_container[0], figure, map), 'Simple: top container filled');
    ok(treesaver.layout.Page.fillContainer($bottom_container[0], figure, map), 'Simple: bottom container filled');
    equals($top_container.height(), 200, 'Simple: Top container height');
    equals($bottom_container.height(), 200, 'Simple: Bottom container height');
    ok(!$top_container.hasClass('flexed'), 'Simple: Top container not flexed');
    ok($bottom_container.hasClass('flexed'), 'Simple: Bottom container flexed');

    // Reset our containers
    $page.find('.container').removeClass('matched size flexed').html('').css({ top: 0, bottom: 0, height: 'auto' });
    // Now, go ahead and add two columns. They should be pushed up from the bottom
    // and top by each filled container
    $col = $('<div class="column"></div>').css({ top: 0, bottom: 0, position: 'absolute'}).appendTo($page);
    $col = $('<div class="column"></div>').css({ top: 0, bottom: 0, position: 'absolute'}).appendTo($page);
    ok(treesaver.layout.Page.fillContainer($top_container[0], figure, map), 'Two col: container filled');
    ok(treesaver.layout.Page.fillContainer($bottom_container[0], figure, map), 'Two col: container filled');
    equals($top_container.height(), 200, 'Two col: Top container height');
    equals($bottom_container.height(), 200, 'Two col: Bottom container height');
    ok(!$top_container.hasClass('flexed'), 'Two col: Top container not flexed');
    ok($bottom_container.hasClass('flexed'), 'Two col: Bottom container flexed');
    // Now, check on the columns
    ok($col.hasClass('flexed'), 'Two col: Column class flag');
    equals($col.height(), 600, 'Two col: Column height');
    equals($col[0].offsetTop, 200, 'Two col: Offset from top');
    $col = $page.find('.column').first();
    equals($col.height(), 600, 'Two col: Column height');
    equals($col[0].offsetTop, 200, 'Two col: Offset from top');
  });

  test('sizeToContainer', function () {

  });

  test('computeOverhang', function () {
    var br = new treesaver.layout.BreakRecord(),
        colHeight = 500,
        height = 500,
        // Construct a minimal datastructure instead of trying to make a real class
        block = {
          breakable: true,
          children: null,
          index: 1,
          blocks: [],
          metrics: {
            h: 500,
            outerH: 500,
            bpBottom: 0,
            lineHeight: 20
          }
        },
        result;

    // Perfect fit, everything should be normal
    br.index = 1;
    result = treesaver.layout.Page.computeOverhang(br, block, colHeight, height);
    equals(br.overhang, 0, 'Perfect fit: overhang');
    equals(result, colHeight, 'Perfect fit: colHeight');
    equals(br.index, 1, 'Perfect fit: br.index');

    // Simple overhang
    block.metrics.h = block.metrics.outerH = 600;
    height = 600;
    result = treesaver.layout.Page.computeOverhang(br, block, colHeight, height);
    equals(br.overhang, 100, 'Simple overhang: overhang');
    equals(result, colHeight, 'Simple overhang: colHeight');
    equals(br.index, 1, 'Simple overhang: br.index');

    // Simple underhang
    block.metrics.h = block.metrics.outerH = 400;
    height = 400;
    result = treesaver.layout.Page.computeOverhang(br, block, colHeight, height);
    equals(br.overhang, 0, 'Simple underhang: overhang');
    equals(result, colHeight, 'Simple underhang: colHeight');
    equals(br.index, 1, 'Simple underhang: br.index');

    // Overhang with simple multiple
    block.metrics.lineHeight = 40;
    block.metrics.h = block.metrics.outerH = 600;
    height = 600;
    result = treesaver.layout.Page.computeOverhang(br, block, colHeight, height);
    equals(br.overhang, 120, 'Simple multiple: overhang');
    equals(result, 480, 'Simple multiple: colHeight');
    equals(br.index, 1, 'Simple multiple: br.index');

    // Overhang that has no line content (border/padding only)
    // Should advance the break record by one since there will
    // be no overhang
    block.metrics.lineHeight = 20;
    block.metrics.bpBottom = 100;
    block.metrics.h = 500;
    result = treesaver.layout.Page.computeOverhang(br, block, colHeight, height);
    equals(br.overhang, 0, 'BP-only overhang: overhang');
    equals(result, 500, 'BP-only overhang: colHeight');
    equals(br.index, 2, 'BP-only overhang: br.index');

    // Huge BP as overhang, should be no different than a small one
    block.metrics.h = block.metrics.bpBottom = 300;
    result = treesaver.layout.Page.computeOverhang(br, block, colHeight, height);
    equals(br.overhang, 0, 'Huge BP-only overhang: overhang');
    equals(result, 500, 'Huge BP-only overhang: colHeight');
    equals(br.index, 2, 'Huge BP-only overhang: br.index');

    // Overhang that causes a mis-sync with line-height
    br.index = 1;
    block.metrics.lineHeight = 80;
    block.metrics.bpBottom = 60;
    block.metrics.outerH = height = 620;
    block.metrics.h = 560;
    result = treesaver.layout.Page.computeOverhang(br, block, colHeight, height);
    equals(br.overhang, 140, 'Mis-sync BP overhang: overhang');
    equals(result, 480, 'Mis-sync BP overhang: colHeight');
    equals(br.index, 1, 'Mis-sync BP overhang: br.index');

    // Now, some overhang that only exists in the parent's bp space
    br.index = 1;
    block.metrics.lineHeight = 20;
    block.metrics.bpBottom = 60;
    block.metrics.outerH = 460;
    block.metrics.h = 400;
    height = 550;
    result = treesaver.layout.Page.computeOverhang(br, block, colHeight, height);
    equals(br.overhang, 0, 'Parent-only BP overhang: overhang');
    equals(result, 500, 'Parent-only BP overhang: colHeight');
    equals(br.index, 2, 'Parent-only BP overhang: br.index');
  });

  test('fillColumn', function () {
    // We use this column to test the various configurations
    var $col = $('<div></div>').addClass('column testonly').height(220).appendTo('body'),
        br = new treesaver.layout.BreakRecord(),
        content = {
          blocks: (new treesaver.layout.Block($('.content.column')[0], 20, { index: 0, figureIndex: 0 })).blocks,
          lineHeight: 20
        },
        block,
        parentBlock = content.blocks[0].parent,
        maxColHeight = 200,
        i, len;

    for (i = 0, len = content.blocks.length; i < len; i += 1) {
      block = content.blocks[i];
      // Gotta number the blocks
      block.index = i;
      // Clear out the parent block if it's the top parent (which we want to ignore)
      if (block.parent === parentBlock) {
        block.parent = null;
      }
    }

    // Fill in our test column
    // First six blocks in content are <h1> with 40px height, 40px padding, no margin
    // followed by five 100px paragraphs with no margin/padding
    treesaver.layout.Page.fillColumn(content, br, $col[0], maxColHeight)

    // 220px of height will be consumed by h1 (plus bottom margin), p, and p with 20 overhang
    equals(br.index, 2, 'br.index');
    equals(br.overhang, 80, 'br.overhang');
    equals($col.children().length, 3, 'childNodes.length');

    // OK, now let's do it again, but with a slightly taller column
    $col.html('').height(380);
    // This time, we'll have an overhang applied to the first block 80px 
    // and then the next three paragraphs should fit perfectly
    treesaver.layout.Page.fillColumn(content, br, $col[0], 380)
    equals(br.index, 6, 'br.index');
    equals(br.overhang, 0, 'br.overhang');
    equals($col.children().length, 4, 'childNodes.length');
    equals($col.children().first().css('margin-top'), '-20px', 'first child margin top');

    // Next paragraph is 200px high and keeptogether. Reduce height to make sure it
    // doesn't get put in
    $col.html('').height(100);
    treesaver.layout.Page.fillColumn(content, br, $col[0], maxColHeight)
    equals(br.index, 6, 'Non-fitting keeptogether: br.index');
    equals(br.overhang, 0, 'Non-fitting keeptogether: br.overhang');
    equals($col.children().length, 0, 'Non-fitting keeptogether: childNodes.length');

    // However, if there's no column higher than the current, we need to just shove
    // the large paragraph in and deal with the overflow
    treesaver.layout.Page.fillColumn(content, br, $col[0], 100)
    equals(br.index, 6, 'Forced fit keeptogether: br.index');
    equals(br.overhang, 120, 'Forced fit keeptogether br.overhang'); // Needs to sync to line height
    equals($col.children().length, 1, 'Forced fit keeptogether childNodes.length');
    equals($col.children().first().css('margin-top'), '0px', 'Forced fit keeptogether margin top');

    // Let's torment that keeptogether block with another short column
    $col.html('');
    treesaver.layout.Page.fillColumn(content, br, $col[0], 100)
    equals(br.index, 6, '2x Forced fit keeptogether: br.index');
    equals(br.overhang, 40, '2x Forced fit keeptogether br.overhang'); // Needs to sync to line height
    equals($col.children().length, 1, '2x Forced fit keeptogether childNodes.length');
    equals($col.children().first().css('margin-top'), '-80px', '2x Forced fit keeptogether margin top');

    // Finally, let's let it all fit in there and take a couple of other blocks with it
    // Now we have some nested elements, make sure that they are properly nested
    // There is 20px padding, and two 60px paragraphs inside
    // First paragraph will fit fine, but not the second
    $col.html('').height(120);
    treesaver.layout.Page.fillColumn(content, br, $col[0], 150);
    equals(br.index, 9, 'Nesting start: br.index');
    equals(br.overhang, 0, 'Nesting start: br.overhang');
    equals($col.children().length, 2, 'Nesting start: Two children in column');
    equals($col.find('.nested').children().length, 1, 'Nesting start: Only one child in nested');
    equals($col.children().first().css('margin-top'), '-160px', 'Nesting start: first child margin top');

    // Continue the column and make sure that we do the proper nesting for the paragraph,
    // and make sure to include the bottom border of the parent div
    $col.html('').height(100);
    treesaver.layout.Page.fillColumn(content, br, $col[0], maxColHeight);
    equals(br.index, 10, 'br.index');
    equals(br.overhang, 80, 'br.overhang');
    equals($col.children().length, 2, 'Two children in column');
    equals($col.find('.nested').children().length, 1, 'Only one child in nested');
    equals($col.children().first().css('margin-top'), '0px', 'first child margin top');

    // Run through again and it will fit the rest of the paragraph we overflowed
    // We will now fit the first & second child of the nested paragraph with overflow
    // on the second
    $col.html('').height(220);
    treesaver.layout.Page.fillColumn(content, br, $col[0], maxColHeight);
    equals(br.index, 14, 'br.index');
    equals(br.overhang, 60, 'br.overhang');
    equals($col.children().length, 2, 'Two children in column');
    equals($col.children().last().length, 1, 'One child in nested container');
    equals($col.find('.nested.border .border').children().length, 2, 'Two paragraphs in nested container');
    equals($col.find('p').length, 3, 'Three paragraphs total');
    equals($col.children().first().css('margin-top'), '-20px', 'first child margin top');

    // Now run through again in order to make sure we don't add a child too many
    $col.html('').height(100);
    treesaver.layout.Page.fillColumn(content, br, $col[0], maxColHeight);
    equals(br.index, 15, 'br.index');
    equals(br.overhang, 0, 'br.overhang');
    equals($col.children().length, 1, 'One child in column');
    equals($col.find('.nested.border').children().length, 1, 'One child in container');

    // Close out the nesting, which requires 120px for para + 20px padding
    // Then we add a paragraph with 20px top margin and 40px bottom (plus 100px height)
    // We want only the first of these margin paragraphs to fit, not the second
    $col.html('').height(300);
    treesaver.layout.Page.fillColumn(content, br, $col[0], maxColHeight);
    equals(br.index, 17, 'Margin Bottom: br.index');
    equals(br.overhang, 0, 'Margin Bottom: br.overhang');
    equals($col.children().length, 2, 'Margin Bottom: Two children in column');

    // Now make sure that we don't have overhang that is just border & padding
    // Move the break record manually
    br.index = 18; br.overhang = 0;
    // We have a paragraph within two divs, each div has 20px top & bottom BP
    // and the paragraph is 100px high. So 180px is the total height, let's
    // not give quite that much
    $col.html('').height(160);
    treesaver.layout.Page.fillColumn(content, br, $col[0], maxColHeight);
    equals(br.index, 21, 'BP-only overhang: br.index');
    equals(br.overhang, 0, 'BP-only overhang: br.overhang');
    equals($col.children().length, 1, 'BP-only overhang: One child in column');
  });

  test('fillColumn - keepwithnext', function () {
    // We use this column to test the various configurations
    var $col = $('<div></div>').addClass('column testonly').height(220).appendTo('body'),
        br = new treesaver.layout.BreakRecord(),
        content = {
          blocks: (new treesaver.layout.Block($('.content.column')[0], 20, { index: 0, figureIndex: 0 })).blocks,
          lineHeight: 20
        },
        block,
        parentBlock = content.blocks[0].parent,
        maxColHeight = 200,
        i, len;

    for (i = 0, len = content.blocks.length; i < len; i += 1) {
      block = content.blocks[i];
      // Gotta number the blocks
      block.index = i;
      // Clear out the parent block if it's the top parent (which we want to ignore)
      if (block.parent === parentBlock) {
        block.parent = null;
      }
    }

    // initialize our break record state
    br.index = 21;

    // First paragraph is 100px, second is 100px & keepwithnext, third is 200px @ 40 lineHeight
    $col.html('').height(200);
    treesaver.layout.Page.fillColumn(content, br, $col[0], maxColHeight);
    equals(br.index, 22, 'Keepwithnext: br.index');
    equals(br.overhang, 0, 'Keepwithnext: br.overhang');
    equals($col.children().length, 1, 'Keepwithnext: One child in column');

    // Let's make sure that keepwithnext is ignored when it's the first
    // block in the column by making a smaller column that doesn't fit
    // both elements (not officially short column)
    $col.html('').height(100);
    treesaver.layout.Page.fillColumn(content, br, $col[0], 100);
    equals(br.index, 23, 'Keepwithnext ignore on first block: br.index');
    equals(br.overhang, 0, 'Keepwithnext ignore on first block: br.overhang');
    equals($col.children().length, 1, 'Keepwithnext ignore on first block: One child in column');

    // Make sure that keepwithnext isn't ignored when the column is quite small
    br.index = 22; br.overhang = 0;
    $col.html('').height(100);
    treesaver.layout.Page.fillColumn(content, br, $col[0], 300);
    equals(br.index, 22, 'Keepwithnext honor on shortCol: br.index');
    equals(br.overhang, 0, 'Keepwithnext honor on shortCol: br.overhang');
    equals($col.children().length, 0, 'Keepwithnext honor on shortCol: No children in column');

    // Keepwithnext only applies to the final line of the content, so it should be ignored
    // if we have a partial fit.
    // Rewind the break record to test this more easily
    br.index = 21;
    // Now we have a normal paragraph at 100px, and our keepwith next also at 100px
    // We make the keepwithnext paragraph overflow to the next column (since it is not
    // keeptogether)
    $col.html('').height(160);
    treesaver.layout.Page.fillColumn(content, br, $col[0], maxColHeight);
    equals(br.index, 22, 'Keepwithnext break: br.index');
    equals(br.overhang, 40, 'Keepwithnext break: br.overhang');
    equals($col.children().length, 2, 'Keepwithnext break: Two children in column');

    // Make sure we don't try to keepwithnext an already-opened block and push it to the next
    // column foolishly
    $col.html('').height(40);
    treesaver.layout.Page.fillColumn(content, br, $col[0], 60);
    equals(br.index, 23, 'Keepwithnext ignore opened: br.index');
    equals(br.overhang, 0, 'Keepwithnext ignore opened: br.overhang');
    equals($col.children().length, 1, 'Keepwithnext ignore opened: One child in column');

    // Now see if we can avoid needlessly opening a block that ends up empty due to keepwithnext child
    br.index = 23;
    // First paragraph is 200px @ 40 line height
    // Then we have double nesting of divs (with 20px padding each)
    // Plus a 100px keepwithnext followed by a 200px@40 paragraph
    $col.html('').height(340);
    treesaver.layout.Page.fillColumn(content, br, $col[0], 300);
    equals(br.index, 24, 'Keepwithnext avoid opening blocks: br.index');
    equals(br.overhang, 0, 'Keepwithnext avoid opening blocks: br.overhang');
    equals($col.children().length, 1, 'Keepwithnext avoid opening blocks: One child in column');
  });

  test('fillColumn - Pathological Nesting', function () {
    // We use this column to test the various configurations
    var $col = $('<div></div>').addClass('testonly').height(320).appendTo('body'),
        $nesting = $('<div></div>').addClass('annoying-nesting'),
        br = new treesaver.layout.BreakRecord(),
        content = {}, i, len, parentBlock,
        maxColHeight = 200;

    $nesting.html(
      '<div class="annoying-nesting">' +
        '<div class="annoying-nesting">' +
          '<h3 class="keeptogether keepwithnext">Title</h3>' +
          '<p class="intro">' +
          '</p>' +
        '</div>' +
      '</div>');

    $nesting.clone().appendTo($col);
    $nesting.clone().appendTo($col);
    $nesting.clone().appendTo($col);

    content = {
      blocks: (new treesaver.layout.Block($col[0], 20, { index: 0, figureIndex: 0 })).blocks,
      lineHeight: 20
    };

    parentBlock = content.blocks[0].parent;

    for (i = 0, len = content.blocks.length; i < len; i += 1) {
      block = content.blocks[i];
      // Gotta number the blocks
      block.index = i;
      // Clear out the parent block if it's the top parent (which we want to ignore)
      if (block.parent === parentBlock) {
        block.parent = null;
      }
    }

    // We have the following, repeated twice
    // <div> - 20px padding / 320px total height
    //   <div> - 20px padding / 280px total height
    //     <div> - 20px padding / 240px total height
    //       <h3> - 60px height + 20 px margin bottom
    //       <p> - 120px height
    //
    // First, let's place the entire thing in there and make sure it fits
    // correctly, and we maintain our metrics
    treesaver.layout.Page.fillColumn(content, br, $col[0], maxColHeight);

    equals(br.index, 5, 'full fit: br.index');
    equals(br.overhang, 0, 'full fit: br.overhang');
    equals($col.find('*').length, 5, 'full fit: total element count');
    equals($col.find('*').eq(0).css('padding-top'), '20px', 'full fit: First nesting padding-top');
    equals($col.find('*').eq(1).css('padding-top'), '20px', 'full fit: Second nesting padding-top');
    equals($col.find('*').eq(2).css('padding-top'), '20px', 'full fit: Third nesting padding-top');

    // Great, that worked fine. Now let's rewind and make only the h3 fit
    br.index = 0;
    $col.html('').height(120);
    treesaver.layout.Page.fillColumn(content, br, $col[0], 120);

    equals(br.index, 4, 'h3 full fit: br.index');
    equals(br.overhang, 0, 'h3 full fit: br.overhang');
    equals($col.find('*').length, 4, 'h3 full fit: total element count');
    equals($col.find('*').eq(0).css('padding-top'), '20px', 'h3 full fit: First nesting padding-top');
    equals($col.find('*').eq(1).css('padding-top'), '20px', 'h3 full fit: Second nesting padding-top');
    equals($col.find('*').eq(2).css('padding-top'), '20px', 'h3 full fit: Third nesting padding-top');

    // Alright! No let's make sure our continuation works correctly when we have
    // enough space for the rest of our content. We need to make sure our padding
    // gets zeroed out here
    $col.html('').height(180);
    treesaver.layout.Page.fillColumn(content, br, $col[0], 180);
    equals(br.index, 5, 'leftover p full fit: br.index');
    equals(br.overhang, 0, 'leftover p full fit: br.overhang');
    equals($col.find('*').length, 4, 'leftover p full fit: total element count');
    equals($col.find('*').eq(0).css('padding-top'), '0px', 'leftover p full fit: First nesting padding-top');
    equals($col.find('*').eq(1).css('padding-top'), '0px', 'leftover p full fit: Second nesting padding-top');
    equals($col.find('*').eq(2).css('padding-top'), '0px', 'leftover p full fit: Third nesting padding-top');

    // Now, let's rewind and make the <p> overflow
    br.index = 0;
    $col.html('').height(160);
    treesaver.layout.Page.fillColumn(content, br, $col[0], 140);

    equals(br.index, 4, 'p partial fit: br.index');
    equals(br.overhang, 100, 'p partial fit: br.overhang');
    equals($col.find('*').length, 5, 'p partial fit: total element count');
    equals($col.find('*').eq(0).css('padding-top'), '20px', 'p partial fit: First nesting padding-top');
    equals($col.find('*').eq(1).css('padding-top'), '20px', 'p partial fit: Second nesting padding-top');
    equals($col.find('*').eq(2).css('padding-top'), '20px', 'p partial fit: Third nesting padding-top');

    // Now let's give enough space for the rest of this paragraph, plus
    // the H3 of the next (but not enough for it's keep with next block)
    $col.html('').height(280);
    treesaver.layout.Page.fillColumn(content, br, $col[0], 140);

    equals(br.index, 5, 'p finish plus next h3 keepwithnext fail: br.index');
    equals(br.overhang, 0, 'p finish plus next h3 keepwithnext fail: br.overhang');
    equals($col.find('*').length, 4, 'p finish plus next h3 keepwithnext fail: total element count');
    equals($col.find('*').eq(0).css('padding-top'), '0px', 'p finish plus next h3 keepwithnext fail: First nesting padding-top');
    equals($col.find('*').eq(1).css('padding-top'), '0px', 'p finish plus next h3 keepwithnext fail: Second nesting padding-top');
    equals($col.find('*').eq(2).css('padding-top'), '0px', 'p finish plus next h3 keepwithnext fail: Third nesting padding-top');
    equals($col.find('*').eq(3)[0].nodeName.toLowerCase(), 'p', 'p finish plus next h3 keepwithnext fail (second set): Confirm p in right spot');

    // OK, rewind and let's try that one again, but this time let a bit of the paragraph in
    $col.html('').height(320);
    br.index = 4;
    br.overhang = 100;
    treesaver.layout.Page.fillColumn(content, br, $col[0], 140);
    equals(br.index, 9, 'p finish plus next h3 and part of p: br.index');
    equals(br.overhang, 100, 'p finish plus next h3 and part of p: br.overhang');
    equals($col.find('*').length, 9, 'p finish plus next h3 and part of p: total element count');
    equals($col.find('div').length, 6, 'p finish plus next h3 and part of p: div count');
    equals($col.find('*').eq(0).css('padding-top'), '0px', 'p finish plus next h3 and part of p: First nesting padding-top');
    equals($col.find('*').eq(1).css('padding-top'), '0px', 'p finish plus next h3 and part of p: Second nesting padding-top');
    equals($col.find('*').eq(2).css('padding-top'), '0px', 'p finish plus next h3 and part of p: Third nesting padding-top');
    equals($col.find('*').eq(3)[0].nodeName.toLowerCase(), 'p', 'p finish plus next h3 and part of p (second set): Confirm p in right spot');
    equals($col.find('*').eq(4).css('padding-top'), '20px', 'p finish plus next h3 and part of p: First nesting padding-top (second round)');
    equals($col.find('*').eq(5).css('padding-top'), '20px', 'p finish plus next h3 and part of p: Second nesting padding-top (second round)');
    equals($col.find('*').eq(6).css('padding-top'), '20px', 'p finish plus next h3 and part of p: Third nesting padding-top (second round)');
    equals($col.find('*').eq(7)[0].nodeName.toLowerCase(), 'h3', 'p finish plus next h3 and part of p (second set): Confirm h3 in right spot');

    // Now test the next round to make sure we're nesting correctly
    // Let the next item fit this time
    $col.html('').height(420);
    treesaver.layout.Page.fillColumn(content, br, $col[0], 140);

    equals(br.index, 15, 'p finish plus next h3 and part of p: br.index');
    equals(br.overhang, 0, 'p finish plus next h3 and part of p: br.overhang');
    equals($col.find('*').length, 9, 'p finish plus next h3 and part of p: total element count');
    equals($col.find('div').length, 6, 'p finish plus next h3 and part of p: div count');
    equals($col.find('*').eq(0).css('padding-top'), '0px', 'p finish plus next h3 and part of p: First nesting padding-top');
    equals($col.find('*').eq(1).css('padding-top'), '0px', 'p finish plus next h3 and part of p: Second nesting padding-top');
    equals($col.find('*').eq(2).css('padding-top'), '0px', 'p finish plus next h3 and part of p: Third nesting padding-top');
    equals($col.find('*').eq(3)[0].nodeName.toLowerCase(), 'p', 'p finish plus next h3 and part of p (second set): Confirm p in right spot');
    equals($col.find('*').eq(4).css('padding-top'), '20px', 'p finish plus next h3 and part of p: First nesting padding-top (second round)');
    equals($col.find('*').eq(5).css('padding-top'), '20px', 'p finish plus next h3 and part of p: Second nesting padding-top (second round)');
    equals($col.find('*').eq(6).css('padding-top'), '20px', 'p finish plus next h3 and part of p: Third nesting padding-top (second round)');
    equals($col.find('*').eq(7)[0].nodeName.toLowerCase(), 'h3', 'p finish plus next h3 and part of p (second set): Confirm h3 in right spot');
  });
});
