goog.require('treesaver.ui.ArticleManager');
goog.require('treesaver.ui.Article');
goog.require('treesaver.events');

// Run after window loading
$(function () {
  module('articlemanager', {
    setup: function () {
      // Mock out article load function to always be successful
      treesaver.ui.Article.prototype._oldLoad = treesaver.ui.Article.prototype.load;
      treesaver.ui.Article.prototype.load = function () {
        // Do nothing
      };

      // Set the initial url of the article manager
      treesaver.ui.ArticleManager.initialUrl = treesaver.network.stripHash(document.location.href);
    },
    teardown: function () {
      $('.testonly').remove();
      // Restore mock
      treesaver.ui.Article.prototype.load = treesaver.ui.Article.prototype._oldLoad;
      delete treesaver.ui.Article.prototype._oldLoad;
    }
  });

  test('getTOCLocation', function () {
    var root = /http:\/\/[^\/]*\//.exec(treesaver.network.stripHash(document.location.href)),
        basename = /^(.*)\/[^\/]*$/.exec(document.location.pathname)[1].substr(1) ;

    equals(treesaver.ui.ArticleManager.getTOCLocation(), treesaver.network.stripHash(document.location.href), 'Non-existant <link> uses current document');

    // OK, now add a <link> that points here
    $('<link rel="contents" href="http://test.com/" class="testonly" />').appendTo($('head'));
    equals(treesaver.ui.ArticleManager.getTOCLocation(), 'http://test.com/', 'Absolute URL maintained');

    $('link[rel*=contents]').attr('href', '/');
    equals(treesaver.ui.ArticleManager.getTOCLocation(), root, 'Root URL');

    $('link[rel*=contents]').attr('href', '/hello');
    equals(treesaver.ui.ArticleManager.getTOCLocation(), root + 'hello', 'Absolute path');

    $('link[rel*=contents]').attr('href', 'hello');
    equals(treesaver.ui.ArticleManager.getTOCLocation(), root + basename + '/hello', 'Relative path');

    $('link[rel*=contents]').attr('rel', 'self contents');
    equals(treesaver.ui.ArticleManager.getTOCLocation(), treesaver.network.stripHash(document.location.href), 'Self overrides href');
  });

  test('findTOCLinks', function () {
    var root = /http:\/\/[^\/]*\//.exec(treesaver.network.stripHash(document.location.href)),
        basename = /^(.*)\/[^\/]*$/.exec(document.location.pathname)[1].substr(1),
        urls = ['http://example.com/', '/', '/hello', '', '/'],
        html,
        div = document.createElement('div');

    html = '<h1>Fake document title</h1><a href="http://invalid.com/">Non-TOC link</a>.';
    $(urls).each(function () {
      var p = $('<div itemscope></div>');
          a = $('<a itemprop="url">test</a>').attr('href', this);

      a.appendTo(p);
      p.appendTo(div);
    });
    html += $(div).html();

    // Make sure loaded event fires
    treesaver.events.addListener(document, treesaver.ui.ArticleManager.events.TOCUPDATED, function handler() {
      ok(true, 'TOC Loaded event received');
      treesaver.events.removeListener(document, treesaver.ui.ArticleManager.events.TOCUPDATED, handler);
      start();
    });

    treesaver.ui.ArticleManager.load('<article><p>hi</p></article>');
    treesaver.ui.ArticleManager.findTOCLinks(html);

    // Make sure basic ordering stuff works
    ok(treesaver.ui.ArticleManager.articleOrder, 'Order data structure created');
    ok(treesaver.ui.ArticleManager.articleMap, 'Map data structure created');
    ok(treesaver.ui.ArticleManager.articles, 'Articles data structure created');
    ok(treesaver.ui.ArticleManager.articleOrder.length, 'Article order populated');
    equals(treesaver.ui.ArticleManager.articleOrder.length, 5, 'Duplicate URLs inserted twice');
    equals(treesaver.ui.ArticleManager.currentArticleIndex, 3, 'Current Index');
    same(treesaver.ui.ArticleManager.articleMap['http://example.com/'], [0], 'Absolute URL positions');
    same(treesaver.ui.ArticleManager.articleMap[treesaver.network.stripHash(document.location.href)], [3], 'Current URL positions');
    same(treesaver.ui.ArticleManager.articleMap[root], [1, 4], 'Duplicate URLs positions');
    equals(treesaver.ui.ArticleManager.articleOrder[0].url, 'http://example.com/', 'Absolute URL correct');
    equals(treesaver.ui.ArticleManager.articleOrder[1].url, root, 'Root URL correct');

    // Make sure loaded event fires
    stop(4000);
  });

  test('loadingPage', function () {
  });

  test('getArticleIndex / previousArticle / nextArticle', function () {
    var root = /http:\/\/[^\/]*\//.exec(treesaver.network.stripHash(document.location.href)),
        basename = /^(.*)\/[^\/]*$/.exec(document.location.pathname)[1].substr(1),
        urls = ['http://example.com/', '/', '/hello', 'example.html', '/'],
        html,
        div = document.createElement('div'),
        articles = [],
        article;

    html = '<h1>Fake document title</h1><a href="http://invalid.com/">Non-TOC link</a>.';
    $(urls).each(function () {
      var p = $('<div itemscope></div>');
          a = $('<a itemprop="url">test</a>').attr('href', this);

      a.appendTo(p);
      p.appendTo(div);
    });
    html += $(div).html();

    treesaver.ui.ArticleManager.load('<article><p>hi</p></article>');

    treesaver.ui.ArticleManager.findTOCLinks(html);

    articles = urls.map(function (url, i) {
      return treesaver.ui.ArticleManager.articleOrder[i];
    });

    // Test getIndex
    equals(treesaver.ui.ArticleManager._getArticleIndex(articles[0].url), 0, 'getIndex: First article');
    equals(treesaver.ui.ArticleManager._getArticleIndex(articles[1].url), 1, 'getIndex: Second article');
    // Move the current position
    treesaver.ui.ArticleManager.currentArticleIndex = 10;
    equals(treesaver.ui.ArticleManager._getArticleIndex(articles[1].url), 4, 'getIndex: Second with different current position');
    treesaver.ui.ArticleManager.currentArticleIndex = 2;
    equals(treesaver.ui.ArticleManager._getArticleIndex(articles[1].url), 1, 'getIndex: Second with different current position');
    equals(treesaver.ui.ArticleManager._getArticleIndex(articles[1].url, true), 4, 'getIndex: Second with different current position');

    // Restore the normal position
    // TODO: Re-write this given caching
    //treesaver.ui.ArticleManager.currentArticleIndex = 0;
    //ok(!treesaver.ui.ArticleManager.previousArticle(), 'prev: Cannot go before first');
    //article = treesaver.ui.ArticleManager.nextArticle(true);
    //equals(article.url, articles[1].url, 'next: Correct article');
    //treesaver.ui.ArticleManager.currentArticleIndex = 1;
    //article = treesaver.ui.ArticleManager.previousArticle(true);
    //equals(article.url, articles[0].url, 'previous: Correct article');
  });

  //test('setCurrentArticle / setCurrentPosition / events', function () {
    //var root = /http:\/\/[^\/]*\//.exec(document.location.href),
        //basename = /^(.*)\/[^\/]*$/.exec(document.location.pathname)[1].substr(1),
        //urls = ['http://example.com/', '/', '/hello', 'example.html', '/'],
        //html,
        //div = document.createElement('div'),
        //articles = [],
        //redirectFunction = treesaver.ui.ArticleManager.redirectToCurrentArticle;

    //// Mock out redirect function
    //treesaver.ui.ArticleManager.redirectToCurrentArticle = function () {
      //ok(false, 'Article manager tried to redirect');
    //};

    //html = '<h1>Fake document title</h1><a href="http://invalid.com/">Non-TOC link</a>.';
    //$(urls).each(function () {
      //$('<a rev="contents">').attr('href', this).appendTo(div);
    //});
    //html += $(div).html();

    //treesaver.events.addListener(document, treesaver.ui.ArticleManager.events.articleChanged, function handler(e) {
      //var current_article = treesaver.ui.ArticleManager.getCurrentArticle() || {};

      //ok(true, 'ArticleChanged received on first load');
      //equals(e.article.url, current_article.url, 'Article parameter passed in');
      //equals(e.article.url, document.location.href, 'Initial article correct');
      //treesaver.events.removeListener(document, treesaver.ui.ArticleManager.events.articleChanged, handler);
    //});

    //stop(1000);
    //treesaver.ui.ArticleManager.load('<article><p>hi</p></article>');
    //treesaver.ui.ArticleManager.findTOCLinks(html);
    //articles = urls.map(function (url, i) {
      //return treesaver.ui.ArticleManager.articleOrder[i];
    //});

    //// Now go to next article, and make sure event comes through
    //treesaver.events.addListener(document, treesaver.ui.ArticleManager.events.articleChanged, function handler(e) {
      //ok(true, 'ArticleChanged received on next article');
      //equals(e.article.url, articles[1].url, 'Article parameter passed in and correct');
      //equals(treesaver.ui.ArticleManager.getCurrentIndex(), 1, 'CurrentIndex correct');
      //treesaver.events.removeListener(document, treesaver.ui.ArticleManager.events.articleChanged, handler);
      //start();
    //});

    //// Move to next article
    //treesaver.ui.ArticleManager.nextArticle();

    //// Go to prev article, and make sure event comes through
    //treesaver.events.addListener(document, treesaver.ui.ArticleManager.events.articleChanged, function handler(e) {
      //ok(true, 'ArticleChanged received on prev article');
      //equals(e.article.url, articles[0].url, 'Article parameter passed in and correct');
      //equals(treesaver.ui.ArticleManager.getCurrentIndex(), 0, 'CurrentIndex correct');
      //treesaver.events.removeListener(document, treesaver.ui.ArticleManager.events.articleChanged, handler);
    //});

    //// Move to next article
    //treesaver.ui.ArticleManager.previousArticle();

    //// Move to the last article
    //treesaver.events.addListener(document, treesaver.ui.ArticleManager.events.articleChanged, function handler(e) {
      //ok(true, 'ArticleChanged received on setCurrentArticle');
      //equals(e.article.url, articles[3].url, 'Article parameter passed in and correct');
      //equals(treesaver.ui.ArticleManager.getCurrentIndex(), 3, 'CurrentIndex correct');
      //treesaver.events.removeListener(document, treesaver.ui.ArticleManager.events.articleChanged, handler);
    //});

    //// Move to later article
    //treesaver.ui.ArticleManager.setCurrentArticle(articles[3]);

    //// Make sure article with two positions is reached correctly
    //treesaver.events.addListener(document, treesaver.ui.ArticleManager.events.articleChanged, function handler(e) {
      //ok(true, 'ArticleChanged received on next page of double listed');
      //equals(e.article.url, articles[4].url, 'Article parameter passed in and correct');
      //equals(treesaver.ui.ArticleManager.getCurrentIndex(), 4, 'CurrentIndex correct');
      //treesaver.events.removeListener(document, treesaver.ui.ArticleManager.events.articleChanged, handler);
    //});

    //treesaver.ui.ArticleManager.nextArticle();

    //// Make sure we don't get a bogus move at end
    //treesaver.events.addListener(document, treesaver.ui.ArticleManager.events.articleChanged, function handler(e) {
      //ok(false, 'ArticleChanged received when could not go next');
      //treesaver.events.removeListener(document, treesaver.ui.ArticleManager.events.articleChanged, handler);
    //});

    //treesaver.ui.ArticleManager.nextArticle();

    //// That test is our last and shouldn't have an event handler called, so set a time out
    //setTimeout(start, 300);

    //// Restore mock
    //treesaver.ui.ArticleManager.redirectToCurrentArticle = redirectFunction;
  //});
});
