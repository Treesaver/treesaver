goog.require('treesaver.ui.Article');
goog.require('treesaver.events');
goog.require('treesaver.network');

// Run after window loading
$(function () {
  module('article', {
    setup: function () {
      // Create an HTML tree for test data
      // Make request synchronously though
      $.ajax({
        async: false,
        url: '../assets/content.html',
        success: function (data) {
          if (data) {
            var container = document.createElement('div');
            document.body.appendChild(container);
            container.className = 'testonly content column';
            container.appendChild(document.createElement('article'));
            container.firstChild.innerHTML = data;
          }
        }
      });
      $.ajax({
        async: false,
        url: '../assets/grids.html',
        success: function (data) {
          if (data) {
            var container = document.createElement('div');
            document.body.appendChild(container);
            container.className = 'testonly grids';
            container.innerHTML = data;
          }
        }
      });
    },
    teardown: function () {
      $('.testonly').remove();
    }
  });

  // EventHandler object helper
  var eventHandler = function eventHandler(pass, msg, callback) {
    this.pass = pass;
    this.msg = msg;
    this.callback = callback;
    this.handleEvent = function (e) {
      ok(this.pass, this.msg);
      if (this.callback) {
        this.callback();
      }
    }
  };

  test('Construction', function () {
    var $content = $('.testonly.content'),
        article = new treesaver.ui.Article([], $content[0]);

    ok(article, 'Object constructed');
  });

  //test('Async loading: Successful', function () {
    //var xhr_mock = function (path, callback) {
          //setTimeout(function () {
            //callback($('.testonly.content').html());
          //}, 50);
        //},
        //article = new treesaver.ui.Article('/path', 'Title'),
        //loadFailedHandler = new eventHandler(false, 'LoadFailed received'),
        //loadedHandler = new eventHandler(true, 'Loaded received', function () {
          //ok(!article.loading, 'Loading flag cleared');
          //ok(!article.loadFailed, 'Load failed flag not set');
        //});

    //// Set up handlers
    //treesaver.events.addListener(document, treesaver.ui.Article.events.loadFailed, loadFailedHandler);
    //treesaver.events.addListener(document, treesaver.ui.Article.events.loaded, loadedHandler);
    //stop(1000);
    //expect(5);

    //// Hook up the mock object
    //treesaver.network._get = treesaver.network.get;
    //treesaver.network.get = xhr_mock;

    //// Mock handler for processing function
    //article.processHTML = function () {
      //ok(true, 'processHTML called');
    //};

    //article.load();
    //ok(article.loading, 'Loading flag set');

    //// Make sure we clean out the handlers
    //setTimeout(function cleanUp() {
      //treesaver.events.removeListener(document, treesaver.ui.Article.events.loadFailed, loadFailedHandler);
      //treesaver.events.removeListener(document, treesaver.ui.Article.events.loaded, loadedHandler);
      //treesaver.network.get = treesaver.network._get;
      //delete treesaver.network._get;
      //start();
    //}, 400);
  //});

  //test('Async loading: Bad file', function () {
    //var xhr_mock = function (path, callback) {
          //setTimeout(function () {
            //callback(null);
          //}, 50);
        //},
        //article = new treesaver.ui.Article('/path', 'Title'),
        //loadedHandler = new eventHandler(false, 'Loaded received'),
        //loadFailedHandler = new eventHandler(true, 'LoadFailed received', function () {
          //ok(!article.loading, 'Loading flag cleared');
          //ok(article.loadFailed, 'Load failed flag set');
        //});

    //// Set up handlers
    //treesaver.events.addListener(document, treesaver.ui.Article.events.loadFailed, loadFailedHandler);
    //treesaver.events.addListener(document, treesaver.ui.Article.events.loaded, loadedHandler);
    //stop(1000);
    //expect(4);

    //// Hook up the mock object
    //treesaver.network._get = treesaver.network.get;
    //treesaver.network.get = xhr_mock;

    //article.load();
    //ok(article.loading, 'Loading flag set');

    //// Make sure we clean out the handlers
    //setTimeout(function cleanUp() {
      //treesaver.events.removeListener(document, treesaver.ui.Article.events.loadFailed, loadFailedHandler);
      //treesaver.events.removeListener(document, treesaver.ui.Article.events.loaded, loadedHandler);
      //treesaver.network.get = treesaver.network._get;
      //delete treesaver.network._get;
      //start();
    //}, 400);
  //});

  test('HTML content processing', function () {
    var articleNode = $('.testonly.content article')[0],
        article = new treesaver.ui.Article([], articleNode.cloneNode(true)),
        tmp;

    // Passing the html into the constructor should auto-process
    ok(article.content, 'Article content populated after construction');
    ok(article.content.blocks.length && article.content.figures.length,
       'Article content has blocks and figures');
    ok(!article.theme, 'No theme unless specified');

    tmp = articleNode.cloneNode(true);

    // Make sure theme flag is properly extracted
    tmp.setAttribute('data-theme', 'theme');
    article = new treesaver.ui.Article([]);
    console.log(tmp.outerHTML);
    ok(article.processHTML(tmp), 'Returns true on success');
    equals(article.theme, 'theme', 'Theme stored');

    // Make sure we don't do extra work when calling process again
    tmp = article.content;
    ok(article.processHTML(articleNode.cloneNode(true)), 'Returns true on repeat call');
    // We now support refreshing due to caching
    //ok(article.content === tmp, 'Use previous results on repeat call');

    // Make sure error flag is set when we can't extract
    article = new treesaver.ui.Article('', []);
    ok(!article.processHTML('<p>Hello</p>'), 'Returns false on failure');
    ok(article.error, 'Error flag on faulty HTML');
  });

  // Mock grid object
  var MockGrid = function MockGrid(hasTheme, sizeFilter) {
    this.hasTheme = function () { return hasTheme; };
    this.sizeFilter = function () { return sizeFilter; };
    this.stretch = function () {};
    this.capabilityFilter = function () { return true; };
  };

  test('Grid Management', function () {
    var grids = [new MockGrid(true, false), new MockGrid(true, true), new MockGrid(false, false), new MockGrid(false, true), new MockGrid(true, true)],
        article = new treesaver.ui.Article('', []);

    // No theme
    article.setGrids(grids);
    ok(article.grids, 'Grids stored');
    equals(article.grids.length, 5, 'Non-theme grids pass when no theme');
    article.stretchGrids({ w: 100, h: 100 });
    equals(article.eligible_grids.length, 3, 'Non-fitting grid eliminated in stretch');

    // Theme
    article.theme = "Theme";
    article.setGrids(grids);
    ok(article.grids, 'Grids stored');
    equals(article.grids.length, 3, 'Non-theme grids rejected');
    article.stretchGrids({ w: 100, h: 100 });
    equals(article.eligible_grids.length, 2, 'Non-fitting grid eliminated in stretch');
  });

  test('setMaxPageSize', function () {
    // Is this even worth testing?
    // Check for event firing, perhaps?
  });

  test('Pagination', function () {
    var $content = $('.testonly.content article')[0],
        article = new treesaver.ui.Article([], $content),
        grid = new treesaver.layout.Grid($('.grid.twocontainer')[0]),
        pos;

    // First, let's paginate just the first page
    article.setGrids([grid]);
    article.setMaxPageSize({ w: 3000, h: 300 });
    article.resetPagination(); // Call manually since we're hitting private API
    ok(article.paginationClean, 'Article pagination clean after reset');
    article.paginate(false, 0);
    ok(article.pages, 'Pages array exists');
    equals(article.pages.length, 1, 'Pages array has only one page');

    // OK, now let's paginate two pages
    article.resetPagination(); // Call manually since we're hitting private API
    article.paginate(false, 1);
    equals(article.pages.length, 2, 'Pages array has two pages when index is 2');

    // Save out the position, and then paginate until it
    pos = article.pages[1].end;
    article.resetPagination(); // Call manually since we're hitting private API
    article.paginate(false, null, pos);
    equals(article.pages.length, 2, 'Pages array has two pages when pos is end of second page');

    // Paginate to the end
    article.resetPagination(); // Call manually since we're hitting private API
    article.paginate(false, Infinity);
    ok(article.br.finished, 'BreakRecord finished');
  });

  test('Pagination: Async', function () {
    // TODO
    // Make sure events get called
  });

  test('getPages', function () {
    var $content = $('.testonly.content article')[0],
        article = new treesaver.ui.Article([], $content),
        grid = new treesaver.layout.Grid($('.grid.twocontainer')[0]),
        pages,
        page,
        handler, handler2, handler3;

    // Setup content and grids
    article.setGrids([grid]);
    article.setMaxPageSize({ w: 300, h: 300 });

    handler3 = function handler3(e) {
      if (e.completed) {
        treesaver.events.removeListener(document, treesaver.ui.Article.events.PAGINATIONPROGRESS, handler3);

        ok(true, 'Pagination completed received after negative start');
        ok(article.br.finished, 'Article pagination completed');

        var end_pages = article.getPages(-1, 3);
        equals(end_pages.length, 3, '3 pages received from end');
        ok(end_pages[0], 'Final page exists');

        start();
      }
    };

    handler2 = function handler2() {
      ok(true, 'Second pagination event received');
      treesaver.events.removeListener(document, treesaver.ui.Article.events.PAGINATIONPROGRESS, handler2);

      // Just get the newly generated page
      var new_pages = article.getPages(2, 1);
      equals(new_pages.length, 1, 'One page returned');
      ok(new_pages[0], 'Page 3 exists');

      // Now fetch from the back
      treesaver.events.addListener(document, treesaver.ui.Article.events.PAGINATIONPROGRESS, handler3);

      new_pages = article.getPages(-1, 100);
      ok(!article.br.finished, 'Article pagination not completed');
      equals(new_pages.length, 100, 'Returned array has correct length even though pagination incomplete');
    };

    // Event handler
    handler = function handler() {
      ok(true, 'Pagination event received');

      // Now get the pages
      var new_pages = article.getPages(0, 2),
          more_pages;

      equals(article.pages.length, 2, 'Two pages paginated when event fired');
      equals(new_pages.length, 2, 'Two pages returned');
      ok(new_pages[0], 'Page one populated');
      ok(new_pages[1], 'Page two populated');
      treesaver.events.removeListener(document, treesaver.ui.Article.events.PAGINATIONPROGRESS, handler);
      treesaver.events.addListener(document, treesaver.ui.Article.events.PAGINATIONPROGRESS, handler2);

      // OK, now fetch three pages, forcing the next page to paginate, while
      // the first two are returned normally
      more_pages = article.getPages(0, 3);
      ok(new_pages[0] === more_pages[0], 'Page 1 re-used on second call');
      ok(new_pages[1] === more_pages[1], 'Page 2 re-used on second call');
      ok(!new_pages[2], 'Page 3 empty on second call');
    };

    treesaver.events.addListener(document, treesaver.ui.Article.events.PAGINATIONPROGRESS, handler);

    // Grab the first two pages
    pages = article.getPages(0, 2);
    equals(pages.length, 2, 'Two pages returned');
    ok(!pages[0] && !pages[1], 'getPages null before pagination');
    //ok(article.pages.length >= 3, 'At least 3 pages paginated');

    //// Ask for a stupid page
    //pages = article.getPages(1, 10000);
    //equals(pages.length, 2, 'Two pages returned');
    //ok(!pages[1], 'Out of range page slot empty');
    //ok(article.br.finished, 'Entire article paginated after huge request');

    //// Make sure we're getting the same page back
    //page = pages[0];
    //pages = article.getPages(1, 1);
    //ok(pages[0] === page, 'Same page returned for same index');

    //// Now change the size and make sure a re-layout happens
    //article.setMaxPageSize({ w: 300, h: 400 });
    //ok(!article.paginationClean, 'Pagination marked dirty after resize');
    //pages = article.getPages(1, 1);
    //ok(pages[0] !== page, 'Different page returned after re-layout');

    // Give time for async stuff to happen
    stop(10000);
  });

  test('getPageIndex', function () {
    var $content = $('.testonly.content'),
        article = new treesaver.ui.Article([]),
        grid = new treesaver.layout.Grid($('.grid.twocontainer')[0]),
        tests = [],
        pos,
        handler;

    // Setup content and grids
    article.setGrids([grid]);
    article.setMaxPageSize({ w: 300, h: 300 });

    handler = function handler() {
      var current = tests.shift();

      if (current) {
        current.f.apply(null, eval(current.args));

        if (current.start) {
          treesaver.events.removeListener(document, treesaver.ui.Article.events.PAGINATIONPROGRESS, handler);
          start();
        }
      }
    };
    treesaver.events.addListener(document, treesaver.ui.Article.events.PAGINATIONPROGRESS, handler);

    //stop(2000);

    // Start with the beginning of the content
    tests.push({
      f: equals,
      args: "[article.getPageIndex(pos), 0, 'Virgin position returns first page']",
      start: false
    });
    tests.push({
      f: ok,
      args: "[article.pages.length, 'At least first page paginated after getPage Index query']",
      start: true
    });
    pos = new treesaver.layout.BreakRecord().getPosition();
    equals(article.getPageIndex(pos), -1, 'Negative one returned before conten paginated');

    article.processHTML($content.html());

    //equals();
    //ok(article.pages.length > 0, 'At least first page paginated after getPageIndex query');

    //// Ok, so we know we have at least one more page, let's grab that position
    //// and test
    //pos = article.pages[0].end.clone();
    //equals(article.getPageIndex(pos), 0, 'Exact end position returns same page as end');
    //// Subtract just a tiny bit of overhang, and we will always push to the next page
    //pos.overhang -= 10;
    //equals(article.getPageIndex(pos), 1, 'Greater than end position returns next page');
    //ok(article.pages.length > 1, 'At least first two pages paginated after getPageIndex query');
    //pos.overhang += 20;
    //equals(article.getPageIndex(pos), 0, 'Less than end position returns prev page');

    //// Grab the second page position and save it
    //pos = article.pages[1].end.clone();
    //// Change size in order to clear out content, to lesser height
    //article.setMaxPageSize({ w: 300, h: 200 });
    //ok(article.getPageIndex(pos) > 1, 'Position at smaller page size gets higher page index');

    //// Now let's try a larger page size
    //article.setMaxPageSize({ w: 300, h: 700 });
    //equals(article.getPageIndex(pos), 0, 'Position at larger page size on first page');

    //// Finally, do something huge
    //pos.index = Infinity;
    //equals(article.getPageIndex(pos), article.pageCount - 1, 'Infinite position on last page');
  });
});
