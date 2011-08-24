goog.require('treesaver.resources');

$(function() {
  module('resources', {
    setup: function () {
      treesaver.scheduler.stopAll();
      jQuery('<link rel="resources" href="assets/resources.html" />').appendTo(document.documentElement);
    },
    teardown: function () {
      jQuery('link[rel*=resources]').remove();
      treesaver.resources.unload();
      treesaver.scheduler.stopAll();
    }
  });

  test('callbacks', function () {
    expect(4);
    stop (2000);

    ok('load' in treesaver.resources, "Library exposed");
    treesaver.resources.load(function () {
      ok(true, 'First callback');
      treesaver.resources.load(function () {
        ok(true, 'Post-load callback');
        start();
      });
    });
    treesaver.resources.load(function () {
      ok(true, 'In-progress callback');
    });
  });

  test('helpers', function () {
    equals(treesaver.resources.getResourcesLinkUrl_(), 'assets/resources.html', 'getResourcesLinkUrl_');

    // Remove from tree
    jQuery('link[rel*=resources]').remove();
    ok(!treesaver.resources.getResourcesLinkUrl_(), 'getResourcesLinkUrl_: No link element');

    // Add one with multiple values and try again
    jQuery('<link rel="test resources prefetch hellothere" href="assets/resources2.html" />').appendTo('head');
    equals(treesaver.resources.getResourcesLinkUrl_(), 'assets/resources2.html', 'getResourcesLinkUrl_: Multiple rel values');
  });

  test('findByClassName', function () {
    stop(2000);
    expect(3);
    treesaver.resources.load(function () {
      equals(treesaver.resources.findByClassName('chrome').length, 1, 'Find resource by class');
      ok(treesaver.resources.findByClassName('grid').length, 'Grids found');
      ok(!treesaver.resources.findByClassName('notarealclassname').length, 'Bogus class not found');
      start();
    });
  });

  test("Handle Dead Servers", function() {
    expect(1);
    stop();

    $('<link[rel*=resources]').remove();
    $('<link rel="resources" href="http://localhost.name.foobar/" />')
      .appendTo($('head'));
    treesaver.resources.load(function() {
      ok(true, "Callback received on invalid resource URL");
      start();
    });
  });
});
