goog.require('treesaver.ui.Index');

goog.require('treesaver.json');

$(function () {
  module('index', {
    // Override treesaver.network.get so we don't have to do actual XHR requests
    setup: function () {
      oldGet = treesaver.network.get;
      treesaver.network.get = function (url, fn) {
        if (url === 'http://www.example.com/index.json') {
          fn(treesaver.json.stringify({
            contents: [
              {
                url: '1.html'
              }
            ]
          }));
        } else if (url === 'http://www.example.com/toc.json') {
          fn(treesaver.json.stringify({
            contents: [
              {
                url: '1.html'
              }
            ]
          }));
        } else if (url === 'http://www.example.com/fail.json') {
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

  test('Index.parse', function () {
    var i = new treesaver.ui.Index('http://www.example.com/toc.json'),
        result = [];

    result = i.parse('');
    equal(result.contents.length, 0, 'empty index returns empty array');

    result = i.parse({});
    equal(result.contents.length, 0, 'invalid value returns empty array');

    result = i.parse('{sdds]');
    equal(result.contents.length, 0, 'invalid JSON is rejected');

    result = i.parse('{"contents":[{"url": "test.html"}]}');
    equal(result.contents.length, 1, 'string is correctly parsed as JSON');

    result = i.parse({
        contents: [
          {
            "url": "index.html"
          },
          {
            "url": "article1.html"
          }
        ]
    });
  
    equal(result.contents.length, 2, 'parsed two documents');
    equal(result.contents[0].url, treesaver.network.absoluteURL('index.html'), 'document one url resolved');
    equal(result.contents[1].url, treesaver.network.absoluteURL('article1.html'), 'document two url resolved');

    result = i.parse({
      contents: [
        {
          "url": "index.html"
        },
        {
          "url": "article.php?id=1"
        },
        {
          "url": "index.html#notes"
        }
      ]
    });

    equal(result.contents.length, 3, 'parsed three documents');
    equal(result.contents[0].url, treesaver.network.absoluteURL('index.html'), 'document one url resolved');
    equal(result.contents[1].url, treesaver.network.absoluteURL('article.php?id=1'), 'document two url resolved and correct');
    equal(result.contents[2].url, treesaver.network.absoluteURL('index.html'), 'document three resolved and hash stripped');
    ok(result.contents[0].equals(result.contents[2]), 'first and third document are equal (but not strictly equal)');

    result = i.parse({
      contents: [
        {
          "url": "index.html",
          "contents": [
            {
              "url": "article1.html"
            },
            {
              "url": "article2.html"
            }
          ]
        }
      ]
    });
    equal(result.contents.length, 1, 'parsed one document');
    equal(result.contents[0].contents.length, 2, 'with two child documents');

    result = i.parse({
      contents: [
        {
          "url": "index.html",
          "title": "Hello World"
        }
      ]
    });
    equal(result.contents.length, 1, 'parsed one document');
    equal(result.contents[0].meta['title'], 'Hello World', 'Meta data is extracted correctly');

    result = i.parse({
      contents: [
        'article1.html',
        'article2.html'
      ]
    });

    equal(result.contents.length, 2, 'parsed two documents');
    equal(result.contents[0].url, treesaver.network.absoluteURL('article1.html'));
    equal(result.contents[1].url, treesaver.network.absoluteURL('article2.html'));
  });

  test('Index.walk', function () {
    var i = new treesaver.ui.Index('http://www.example.com/toc.json'),
        toc = i.parse({
          contents: [
            {
              "url": "index.html",
              "contents": [
                  {
                    "url": "one.html"
                  },
                  {
                    "url": "test.html"
                  }
              ]
            },
            {
              "url": "two.html"
            },
            {
              "url": "three.html"
            }
          ]
      }).contents,
      j = 0;

    expect(5);

    i.walk(toc, function (doc, i) {
      if (j === 0) {
        equal(doc.url, treesaver.network.absoluteURL('index.html'));
      } else if (j === 1) {
        equal(doc.url, treesaver.network.absoluteURL('one.html'));
      } else if (j === 2) {
        equal(doc.url, treesaver.network.absoluteURL('test.html'));
      } else if (j === 3) {
        equal(doc.url, treesaver.network.absoluteURL('two.html'));
      } else if (j === 4) {
        equal(doc.url, treesaver.network.absoluteURL('three.html'));
      }
      j += 1;
    });
  });

  test('Index.load: simple', function () {
    var i = new treesaver.ui.Index('http://www.example.com/index.json'),
        handler = function (e) {
          var i = e.index;

          equal(i.url, 'http://www.example.com/index.json', 'index is correctly loaded');
          equal(i.contents.length, 1, 'one document parsed');
          ok(!i.loading, 'index has finished loading');
          ok(i.loaded, 'index officially loaded');
          ok(!i.loadFailed, 'loaded successfully');
          treesaver.events.removeListener(document, treesaver.ui.Index.events.LOADED, handler);
        };

    expect(5);

    treesaver.events.addListener(document, treesaver.ui.Index.events.LOADED, handler);
    i.load();
  });

  test('Index.load: failed', function () {
    var i = new treesaver.ui.Index('http://www.example.com/fail.json');
        handler = function (e) {
          var i = e.index;
          equal(i.url, 'http://www.example.com/fail.json');
          ok(i.loadFailed, 'load failed');
          ok(!i.loaded, 'loaded is false');
          ok(!i.loading, 'loading has finished');
          treesaver.events.removeListener(document, treesaver.ui.Index.events.LOADFAILED, handler);
        };

    expect(4);

    treesaver.events.addListener(document, treesaver.ui.Index.events.LOADFAILED, handler);
    i.load();
  });

  test('Index.load: cache', function () {
    var index = new treesaver.ui.Index('http://www.example.com/toc.json'),
        i = 0,
        handler = function (e) {
          var idx = e.index;

          console.log(e);

          equal(idx.url, 'http://www.example.com/toc.json');

          i += 1;

          if (i === 1) {
            equal(idx.contents.length, 1, 'length set correct on first call');
          } else if (i === 2) {
            equal(idx.contents.length, 0, 'no documents found due to corrupt cache');
          } else if (i === 3) {
            equal(idx.contents.length, 1, 'correct again after retrieving up to date content');
          }

          if (i === 1) {
            // corrupt the cache
            treesaver.storage.set(treesaver.ui.Index.CACHE_STORAGE_PREFIX + 'http://www.example.com/toc.json', 'corrupt the cache');
          } else if (i === 3) {
            treesaver.events.removeListener(document, treesaver.ui.Index.events.LOADED, handler);
          }
        };

    expect(6);

    treesaver.events.addListener(document, treesaver.ui.Index.events.LOADED, handler);
    index.load(); // First call sets the cache value, and immediately 'corrupts' it in the callback
    index.load(); // Second takes content from the cache, then notices the content has changed and fires another LOADED event
  });
});

