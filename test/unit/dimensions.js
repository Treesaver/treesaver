goog.require('treesaver.dimensions');

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

    equals(treesaver.dimensions.toPixels('40px'), 40, 'toPixels');
    ok(!treesaver.dimensions.toPixels('1em'), 'toPixels: Non-px value');
  });
});
