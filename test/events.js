goog.require('treesaver.events');

$(function() {
  module('events');

  test('Built-in Event', function(e) {
    var flag,
        el = document.body,
        ev = 'datasetchanged',
        listener = function(e) {

      ok(e, 'Event argument passed to handler');

      if (!flag) {
        flag = true;
        ok(true, 'Event received');
        equals(e.number, 5, 'Data payload value');
        treesaver.events.removeListener(el, ev, listener);
        document.body.ondatasetchanged = null;
        // Fire again to make sure we don't get more than one
        treesaver.events.fireEvent(el, ev, { });
        setTimeout(start, 300);
      }
      else {
        ok(false, 'Event received multiple times');
      }
    };

    treesaver.events.addListener(el, ev, listener);

    stop(1000);
    treesaver.events.fireEvent(el, ev, { number: 5 });
  });

  test('Custom Event', function(e) {
    var flag,
        el = document.body,
        ev = 'custom',
        listener = function(e) {

      ok(e, 'Event argument passed to handler');

      if (!flag) {
        flag = true;
        ok(true, 'Event received');
        equals(e.number, 6, 'Data payload value');
        treesaver.events.removeListener(el, ev, listener);
        // Fire again to make sure we don't get more than one
        treesaver.events.fireEvent(el, ev, { });
        setTimeout(start, 300);
      }
      else {
        ok(false, 'Event received multiple times');
      }
    };

    treesaver.events.addListener(el, ev, listener);

    stop(1000);
    treesaver.events.fireEvent(el, ev, { number: 6 });
  });

  test('Event Name with Weird Characters', function(e) {
    var flag,
        el = document.body,
        ev = 'custom:event.name',
        listener = function(e) {

      ok(e, 'Event argument passed to handler');

      if (!flag) {
        flag = true;
        ok(true, 'Event received');
        equals(e.number, 6, 'Data payload value');
        treesaver.events.removeListener(el, ev, listener);
        // Fire again to make sure we don't get more than one
        treesaver.events.fireEvent(el, ev, { });
        setTimeout(start, 300);
      }
      else {
        ok(false, 'Event received multiple times');
      }
    };

    treesaver.events.addListener(el, ev, listener);

    stop(1000);
    treesaver.events.fireEvent(el, ev, { number: 6 });
  });

  test('EventHandler Object', function (e) {
    var flag1,
        flag2,
        el = document.body,
        ev = 'custom:event.name',
        ev2 = 'datasetchanged',
        listener_obj = {
      handleEvent: function(e) {
        ok(e, 'Event argument passed to handler');

        if (!flag1 && e.type === ev) {
          flag1 = true;
          ok(true, 'Event received');
          equals(e.number, 1, 'Data payload value');
          treesaver.events.removeListener(el, ev, listener_obj);
          // Fire again to make sure we don't get more than one
          treesaver.events.fireEvent(el, ev, { });
        }
        else if (!flag2 && e.type === ev2) {
          flag2 = true;
          ok(true, 'Event received');
          equals(e.number, 2, 'Data payload value');
          treesaver.events.removeListener(el, ev2, listener_obj);
          // Fire again to make sure we don't get more than one
          treesaver.events.fireEvent(el, ev2, { });
        }
        else {
          ok(false, 'Event received multiple times');
        }

        if (flag1 && flag2) {
          setTimeout(start, 300);
        }
      }
    };

    treesaver.events.addListener(el, ev, listener_obj);
    treesaver.events.addListener(el, ev2, listener_obj);

    stop(1000);
    treesaver.events.fireEvent(el, ev, { number: 1 });
    treesaver.events.fireEvent(el, ev2, { number: 2 });
  });
});
