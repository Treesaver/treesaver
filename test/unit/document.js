goog.require('treesaver.ui.Document');

$(function () {
  var oldGet = null;

  module('document', {
    // Override treesaver.network.get so we don't have to do actual XHR requests
    setup: function () {
      oldGet = treesaver.network.get;
      treesaver.network.get = function (url, fn) {
        if (url === 'http://www.example.com/1') {
          fn('<html><head></head><body><article></article></body></html>');
        } else if (url === 'http://www.example.com/2') {
          fn('<html><head></head><body><article></article></body></html>');
        } else if (url === 'http://www.example.com/3') {
          fn(null);
        }
      };
    },
    teardown: function () {
      treesaver.network.get = oldGet;
      oldGet = null;
      // clean the storage after each test
      treesaver.storage.clean();
    }
  });

  test('Document.parse', function () {
    var d = new treesaver.ui.Document('http://www.example.com/');
        result = [];

    result = d.parse('');
    equal(result.length, 0, 'no articles parsed on empty text');

    result = d.parse(null);
    equal(result.length, 0, 'no articles parsed on undefined/null');

    result = d.parse('<article></article>');
    equal(result.length, 1, 'one article returned');

    result = d.parse('<article><article></article></article>');
    equal(result.length, 1, 'nested articles are ignored');

    result = d.parse('<article></article><article></article>');
    equal(result.length, 2, 'correctly extracted two articles');

    result = d.parse('<article></article><article id="notes"></article>');
    equal(result.length, 2, 'two articles returned');
  });

  test('Document.load: simple', function () {
    var d = new treesaver.ui.Document('http://www.example.com/1'),
        handler = function (e) {
          var doc = e.document;

          equal(doc.url, 'http://www.example.com/1', 'document is correctly loaded');
          equal(doc.articles.length, 1, 'one article parsed');
          ok(d.loaded, 'article officially loaded');
          ok(!d.loading, 'article has finished loading');
          ok(!d.loadFailed, 'loaded successfully');
          treesaver.events.removeListener(document, treesaver.ui.Document.events.LOADED, handler);
        };

    expect(5);

    treesaver.events.addListener(document, treesaver.ui.Document.events.LOADED, handler);
    d.load();
  });

  test('Document.load: failed', function () {
    var d = new treesaver.ui.Document('http://www.example.com/3');
        handler = function (e) {
          var doc = e.document;
          equal(doc.url, 'http://www.example.com/3');
          ok(doc.loadFailed, 'load failed');
          ok(!doc.loaded, 'loaded is false');
          ok(!doc.loading, 'loading has finished');
          treesaver.events.removeListener(document, treesaver.ui.Document.events.LOADFAILED, handler);
        };

    expect(4);

    treesaver.events.addListener(document, treesaver.ui.Document.events.LOADFAILED, handler);
    d.load();
  });

  test('Document.load: cache', function () {
    var d = new treesaver.ui.Document('http://www.example.com/2'),
        i = 0,
        handler = function (e) {
          var doc = e.document;

          equal(doc.url, 'http://www.example.com/2');

          i += 1;

          if (i === 1) {
            equal(doc.articles.length, 1, 'length set correct on first call');
          } else if (i === 2) {
            equal(doc.articles.length, 0, 'no articles found due to corrupt cache');
          } else if (i === 3) {
            equal(doc.articles.length, 1, 'correct again after retrieving up to date content');
          }

          if (i === 1) {
            // corrupt the cache
            treesaver.storage.set(treesaver.ui.Document.CACHE_STORAGE_PREFIX + 'http://www.example.com/2', 'corrupt the cache');
          } else if (i === 3) {
            treesaver.events.removeListener(document, treesaver.ui.Document.events.LOADED, handler);
          }
        };

    expect(6);

    treesaver.events.addListener(document, treesaver.ui.Document.events.LOADED, handler);
    d.load(); // First call sets the cache value, and immediately 'corrupts' it in the callback
    d.load(); // Second takes content from the cache, then notices the content has changed and fires another LOADED event
  });

  test('Document.equals', function () {
    var a = new treesaver.ui.Document('http://www.example.com/'),
        b = new treesaver.ui.Document('http://www.example.com/');

    ok(a.equals(b), 'document equals document');
    ok(a.equals('http://www.example.com/'), 'document equals string');
    ok(a.equals('http://www.example.com/index.php'), 'index.php is treated as root');
    ok(a.equals('http://www.example.com/index.html'), 'index.html is treated as root');

    a = new treesaver.ui.Document('http://www.example.com/index.html');

    ok(a.equals('http://www.example.com/'), 'root is treated as index');
    ok(!a.equals('http://www.example.com/index.php'), 'two wrongs do not make a right');
    ok(!a.equals(null), 'null does not equal');
  });
});
