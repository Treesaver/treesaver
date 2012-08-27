goog.require('treesaver.dimensions');
goog.require('treesaver.capabilities');

$(function() {
  module("dimensions", {
    setup: function() {
      var container = $('<div id="tmpContainer"></div>')
        .appendTo('body'),
          $el;

      $el = $('<div class="px" />')
              .css({
                position: 'absolute',
                minWidth: '300px',
                maxWidth: '600px',
                minHeight: '500px',
                maxHeight: '1000px',
                marginTop: '10px',
                padding: '5px 15px'
              })
              .appendTo(container)
    },
    teardown: function () {
      $('#tmpContainer').remove();
      $('.testonly').remove();
    }
  });

  //test("sizeInfo", function() {
    //var $px = $('#tmpContainer .px'),
        //dim;

    //dim = play.sizeInfo($px[0]);
    //selectiveSame(dim, {
      //minWidth: 300,
      //width: 300,
      //maxWidth: 600,
      //minHeight: 500,
      //height: 500,
      //maxHeight: 1000,
      //outerWidth: 330,
      //outerHeight: 510,
      //marginHeight: 10,
      //marginWidth: 0
    //}, 'Pixel values');
  //});

  //test('mergeSizeRange', function () {
    //var r1 = play.mergeSizeRange(),
        //r2 = play.mergeSizeRange();

    //same(r1, {
      //width: 0,
      //height: 0,
      //maxWidth: Infinity,
      //maxHeight: Infinity
    //}, 'Default values');
    //r2.width = 100;
    //r2.height = 200;
    //r2.maxHeight = 400;
    //r1 = play.mergeSizeRange(r1, r2);
    //same(r1, {
      //width: 100,
      //height: 200,
      //maxWidth: Infinity,
      //maxHeight: 400
    //}, 'Default values');
  //});

  test('minimax', function() {
    var e = $('<div></div>').addClass('testonly').appendTo('body'),
        size = new treesaver.dimensions.Metrics(e[0]);

    equals(size.minW, 0, 'min-width is 0');
    equals(size.minH, 0, 'min-height is 0');
    equals(size.maxW, Infinity, 'max-width is set to Infinity');
    equals(size.maxH, Infinity, 'max-height is set to Infinity');

    e.css({
      minWidth: 400,
      minHeight: 200
    });

    size = new treesaver.dimensions.Metrics(e[0]);

    equals(size.minW, 400, 'min-width is 400');
    equals(size.minH, 200, 'min-height is 200');

    e.css({
      maxWidth: 800,
      maxHeight: 400
    });

    size = new treesaver.dimensions.Metrics(e[0]);

    equals(size.maxW, 800, 'max-width is set to 800');
    equals(size.maxH, 400, 'max-height is set to 400');
  });

  test('units', function () {
    var e = $('<div></div>').addClass('testonly').appendTo('body').css({
          display: 'block',
          position: 'absolute',
          fontSize: '1em',
          margin: '1em',
          padding: '2em'
        }),
        d = new treesaver.dimensions.Metrics(e[0]);

    equals(d.marginTop, 16);
    equals(d.marginBottom, 16);
    equals(d.paddingTop, 32);
    equals(d.paddingBottom, 32);
  });

  test('offsetHeight', function() {
    var e = $('<div></div>').addClass('testonly').appendTo('body').css({
          fontSize: '14px',
          lineHeight: '20px'
        }),
        h = $('<h2>Hello World</h2>').appendTo(e).css({
          margin: 0,
          padding: 0,
          fontSize: '20px'
        }),
        d = new treesaver.dimensions.Metrics(e[0]);

    equals(d.outerH, 20);
  });

  test('offsetWidth with subpixels', function() {
    var e = $('<div></div>').addClass('testonly').appendTo('body').css({
          fontSize: '13px',
          lineHeight: '13px'
        }),
        c1 = $('<div></div>').appendTo(e).css({
          "margin-left": '15em',
          width: '21.5em'
        }),
        c2 = $('<div></div>').appendTo(e).css({
          "margin-left": '37.5em',
          width: '21.5em'
        }),
        d1 = new treesaver.dimensions.Metrics(c1[0]),
        d2 = new treesaver.dimensions.Metrics(c2[0]);

    equals(d1.outerW, d2.outerW);
    equals(d1.outerW, treesaver.capabilities.SUPPORTS_SUBPIXELS ? 279.5 : 279);
    equals(d2.outerW, treesaver.capabilities.SUPPORTS_SUBPIXELS ? 279.5 : 279);
  });

  test('offsetWidth rounding', function() {
    var mockWithWidth = function(w) {
      return {
        getBoundingClientRect: function() {
          return { width: w };
        }
      };
    };

    equals(treesaver.dimensions.getOffsetWidth(mockWithWidth(1)), 1);
    equals(treesaver.dimensions.getOffsetWidth(mockWithWidth(1.2344)), 1.234);
    equals(treesaver.dimensions.getOffsetWidth(mockWithWidth(1.2345)), 1.235);
    equals(treesaver.dimensions.getOffsetWidth(mockWithWidth(1.2346)), 1.235);
    equals(treesaver.dimensions.getOffsetWidth(mockWithWidth(0.00000001)), 0);
  });

  test('lineHeight', function() {
    var e = $('<div></div>').addClass('testonly').appendTo('body').css({
          fontSize: '14px',
          lineHeight: '20px'
        }),
        h = $('<h2>Hello World</h2>').appendTo(e).css({
          margin: 0,
          padding: 0,
          fontSize: '20px'
        }),
        d = new treesaver.dimensions.Metrics(e[0]);

    equals(d.lineHeight, 20);
  });

  test('lineHeight with subpixels', function() {
    var e = $('<div></div>').addClass('testonly').appendTo('body').css({
          fontSize: '14px',
          lineHeight: '1.45em'
        }),
        h = $('<h2>Hello World</h2>').appendTo(e).css({
          margin: 0,
          padding: 0,
          fontSize: '1.45em'
        }),
        d = new treesaver.dimensions.Metrics(e[0]);

    if (treesaver.capabilities.SUPPORTS_SUBPIXELS) {
      equals((20.3 - d.lineHeight) < 0.001, true);
    } else {
      equals(d.lineHeight, 20);
    }
  });

  test('helpers', function () {
    var range = {
      minW: 100,
      maxW: 200,
      minH: 300,
      maxH: 400
    };

    ok(treesaver.dimensions.inSizeRange(range, { w: 100, h: 300}), "withinSizeRange: Min boundary");
    ok(treesaver.dimensions.inSizeRange(range, { w: 200, h: 400}), "withinSizeRange: Max boundary");
    ok(!treesaver.dimensions.inSizeRange(range, { w: 20, h: 400 }), "withinSizeRange: Under width");
    ok(!treesaver.dimensions.inSizeRange(range, { w: 200, h: 4000}), "withinSizeRange: Over height");

    equals(treesaver.dimensions.toPixels(null, '40px'), 40, 'toPixels');
    ok(!treesaver.dimensions.toPixels('1em'), 'toPixels: Non-px value');
  });

  test('roundUp', function() {
    equals(treesaver.dimensions.roundUp(0, 18), 18, 'round 0 to 18');
    equals(treesaver.dimensions.roundUp(1, 18), 18, 'round 0 to 18');
    equals(treesaver.dimensions.roundUp(17, 18), 18, 'round 17 to 18');
    equals(treesaver.dimensions.roundUp(18, 18), 36, 'round 18 to 36');
    equals(treesaver.dimensions.roundUp(19, 18), 36, 'round 19 to 36');

    equals(treesaver.dimensions.roundUp(17.9, 18), 18, 'round 17.9 to 18');
    equals(treesaver.dimensions.roundUp(18.1, 18), 36, 'round 18.1 to 36');
  });

});
