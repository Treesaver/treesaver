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
