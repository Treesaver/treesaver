goog.require('treesaver.util');

$(function() {
  module('util', {
    setup: function () {
    },
    teardown: function () {
    }
  });

  test('class_helpers', function () {
    var $el = $('<div></div>'),
        el = $el[0];

    ok(!play.hasClass(el, 'goodbye'), 'hasClass negative');
    play.addClass(el, 'hello');
    equals($el.attr('class'), 'hello', 'addClass');

    ok(play.hasClass(el, 'hello'), 'hasClass positive');
    ok(!play.hasClass(el, 'goodbye'), 'hasClass negative');
    play.removeClass(el, 'hello');
    ok(!play.hasClass(el, 'hello'), 'hasClass negative');
    equals($el.attr('class').length, 0, 'removeClass');

    $el.attr('class', 'one two three foursquare');
    ok(play.hasClass(el, 'three'), 'hasClass multiple');
    ok(play.hasClass(el, 'one') && play.hasClass(el, 'two'), 'hasClass multiple');
    ok(!play.hasClass(el, 'four'), 'hasClass substring ' + $el.attr('class'));

    $el.remove();
  });

  test('qsa', function () {
    var $el = $("<div><p class='foo'></p><div id='bar'></div></p>"),
        el = $el[0];
    ok(play.$, 'Exposed');
    equals(play.$('h1#qunit-header').length, 1, 'Find h1');
    equals(play.$(el, '#bar').length, 1, 'Find in unattached element');
    $el.remove();
  });

  test('element', function () {
    var html = '<DIV><P>Hello</P></DIV>',
        node = play.createElement(html);

    ok(node && node.firstChild, 'createElement');
    equals(play.outerHTML(node.firstChild).toLowerCase(), '<p>hello</p>', 'outerHTML');
  });
});
