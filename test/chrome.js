goog.require('treesaver.ui.Chrome');

// Run after window loading
$(function () {
  module('chrome', {
    setup: function () {
      // Create an HTML tree for test data
      // Make request synchronously though
      $.ajax({
        async: false,
        url: 'assets/chrome.html',
        success: function (data) {
          if (data) {
            var container = document.createElement('div');
            document.body.appendChild(container);
            container.className = 'testonly container';
            container.innerHTML = data;
          }
        }
      });
    },
    teardown: function () {
      $('.testonly').remove();
      treesaver.ui.ArticleManager.unload();
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

  test('Construction and Activation', function () {
    var $chromes = $('.testonly.container .chrome'),
        $container = $('<div class="testonly">').appendTo('body'),
        chrome,
        node;

    $container.empty().append($chromes[0]);
    chrome = new treesaver.ui.Chrome($chromes[0]);

    ok(chrome, 'Object constructed');
    ok((node = chrome.activate({})), 'Activation');
    ok(node === chrome.activate({}), 'Multiple activation keeps same node');
    chrome.deactivate();
    ok(node !== chrome.activate({}), 'New activation makes new node');

    // Remove handlers, etc
    chrome.deactivate();
  });

  // Fits?

  test('setSize & GetPageArea', function () {
    var $chromes = $('.testonly.container .chrome'),
        $container = $('<div class="testonly">').appendTo('body'),
        chrome,
        node,
        size;

    $container.empty().append($chromes[0]);
    chrome = new treesaver.ui.Chrome($chromes[0]);

    node = chrome.activate({});
    $(node).addClass('testonly').appendTo('body');
    chrome.setSize({ w: 1000, h: 500 });
    equals($(node).width(), 1000, 'Width applied');
    equals($(node).height(), 500, 'Width applied');

    same((size = chrome.pageArea), { w: 1000, h: 500 }, 'Full pageArea on minimal chrome');
    ok(size === chrome.pageArea, 'Cached size used on repeated call');

    // Set a new size to make sure we clear out old info
    chrome.setSize({ w: 400, h: 600 });
    equals($(node).width(), 400, 'Width applied');
    equals($(node).height(), 600, 'Width applied');
    same(chrome.pageArea, { w: 400, h: 600 }, 'Full pageArea on minimal chrome');

    // Remove handlers, etc
    chrome.deactivate();
  });

  test('Event handling', function () {
    // Send our own events and make sure stuff gets updated
    // Make sure events are unhooked after deactivation
  });
});
