goog.require('treesaver.scheduler');

$(function() {
  module("scheduler", {
    setup: function () {
      treesaver.scheduler.stopAll();
    },
    teardown: function () {
      treesaver.scheduler.stopAll();
    }
  });

  test('delay', function () {
    expect(3);
    stop(1000);
    treesaver.scheduler.delay(function () {
      start();
      ok(true, 'Function run after delay');
    }, 500);
    treesaver.scheduler.delay(function (arg) {
      ok(arg, 'Function received argument')
    }, 100, [true]);
    treesaver.scheduler.delay(ok, 100, [true, 'Function run after short delay']);
  });

  test('interval', function () {
    var times = 3,
        times2 = 6;
    expect(times + times2);
    stop(times * 500);

    treesaver.scheduler.repeat(function () {
      ok(true, 'Infrequent execution #' + times);
      times -= 1;
      if (times === 0) {
        start();
      }
      else if (times < 0) {
        ok(false, 'Infrequent executed too many times');
      }
    }, 300, times);

    treesaver.scheduler.repeat(function (arg) {
      ok(arg, 'Frequent execution #' + times2);
      times2 -= 1;
      if (times < 0) {
        ok(false, 'Frequent executed too many times');
      }
    }, 50, times2, [true]);
  });

  test('queue', function () {
    expect(3);
    stop(1000);
    treesaver.scheduler.queue(function () { ok('true', 'first queued function run') });
    treesaver.scheduler.queue(function () { ok('true', 'second queued function run') });
    treesaver.scheduler.queue(function () { ok('true', 'third queued function run') });
    treesaver.scheduler.queue(start, []);
  });

  test('debounce', function () {
    var i, n = 6;

    expect(n + 3);
    stop(3000);

    // This should generate one item
    treesaver.scheduler.debounce(ok, 100, [true, 'Function executed once'], false, 'one');
    treesaver.scheduler.debounce(ok, 100, [false, 'Function executed more than once'], false, 'one');
    treesaver.scheduler.debounce(ok, 100, [false, 'Function executed more than once'], false, 'one');
    treesaver.scheduler.debounce(ok, 100, [false, 'Function executed more than once'], false, 'one');
    treesaver.scheduler.debounce(ok, 100, [false, 'Function executed more than once'], false, 'one');

    // Run function closer, but within debounce
    for (i = 0; i < n; i += 1) {
      setTimeout(function () {
        treesaver.scheduler.debounce(ok, 400, [true, 'Function in window'], false, 'two');
        treesaver.scheduler.debounce(ok, 400, [true, 'Immediate function in window'], true, 'two-immediate');
      }, 200 + 300 * i);
    }

    // Run same function many times outside delay period
    for (i = 0; i < n; i += 1) {
      setTimeout(function () {
        treesaver.scheduler.debounce(ok, 100, [true, 'Function executed outside window'], false, 'three');
      } , 300 * (i + 1));
    }

    // Start after delay
    setTimeout(start, 2500);
  });

  test('limit', function () {
    var i, n = 6;

    expect(n + 1 + 3);
    stop(3000);

    // This should generate one item
    treesaver.scheduler.limit(ok, 100, [true, 'Function executed once'], 'one');
    treesaver.scheduler.limit(ok, 100, [false, 'Function executed more than once'], 'one');
    treesaver.scheduler.limit(ok, 100, [false, 'Function executed more than once'], 'one');
    treesaver.scheduler.limit(ok, 100, [false, 'Function executed more than once'], 'one');
    treesaver.scheduler.limit(ok, 100, [false, 'Function executed more than once'], 'one');

    // Run function closer, but within debounce
    function inWindow() {
      ok(true, 'Limited function');
    }
    for (i = 0; i < n - 1; i += 1) {
      setTimeout(function () {
        treesaver.scheduler.limit(inWindow, 400, [], 'two');
      } , 100 + 250 * i);
      // queued at 100, 350, 600, 850, 1100
      // executes at 100, 500, 900
    }

    // Run same function many times outside delay period
    for (i = 0; i < n; i += 1) {
      setTimeout(function () {
        treesaver.scheduler.limit(ok, 100, [true, 'Executed outside limit window'], 'three');
      } , 300 * (i + 1));
    }

    // Start after delay
    setTimeout(start, 2500);
  });

  test('clear', function () {
    var times = 5,
        executed = 0;

    treesaver.scheduler.repeat(function b() {
        ok(true, 'Primary Executed');
        executed += 1;

        if (executed === times) {
          treesaver.scheduler.clear('test');
        }
      }, 100, Infinity, [], 'test');

    // A different function that should *not* be cancelled
    treesaver.scheduler.delay(function c() {
      ok(true, 'Dummy function executed');
    }, 700);

    // Add other functions onto the queue
    treesaver.scheduler.repeat(function () { }, 100, 20);
    treesaver.scheduler.repeat(function () { }, 100, 20);

    // Start after delay
    expect(times + 1); // Dummy function runs once
    stop(2000);
    setTimeout(start, 1000);
  });
});
