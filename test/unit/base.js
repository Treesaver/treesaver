$(function() {
  var play = window.play;

  module("base", {
    setup: function () {
      $('<link rel="resources" href="assets/resources.html" class="testonly" />')
        .appendTo('head');
      $('<div id="testContainer" class="testonly"></div>').appendTo('body');

      if (document.createStyleSheet) {
        // Fuck IE
        var ss = document.createStyleSheet('assets/style.css');
        $('link[rel=stylesheet]').last().addClass('testonly');
      }
      else {
        $('<link rel="stylesheet" href="assets/style.css" class="testonly" />')
          .appendTo('head');
      }

      // Load up article content into the body
      $.ajax({
        // Block for loading
        async: false,
        success: function (data, status, xhr) {
          $(data).filter('#content')
            .addClass('testonly')
            .appendTo('#testContainer');
        },
        url: 'textonly.html'
      });
    },
    teardown: function () {
      // Run in case there is a failure in the restore
      $('.testonly').remove();
      play.restore(null, function () {
        $('.testonly').remove();
      });
      $('.testonly').remove();
    }
  });

  test("Initialization and Callbacks", function() {
    expect(8);
    ok(play, 'Library exposed');
    ok(play.requirementsMet(), 'Browser requirements met');
    if (play.requirementsMet()) {
      stop(1000);
      play.init(function () {
        start();
        ok(true, 'Callback before completion');
        play.init(function () {
          ok(true, 'Callback after completion');
        });

        ok($('.chrome').length, 'Chrome created');
        ok($('.chrome .viewer').length, 'Viewer created');

        ok($('#articles').length, 'Article Container created');

        ok($('.chrome .viewer .grid').children().length,
          'At least one page created in viewer');
        start();
      });
    }
  });

  test("Restore", function () {
    var old_html = $('body').html();
    expect(2);
    stop(1000);
    play.init(function () {
      play.restore(null, function () {
        start();
        ok(old_html == $('body').html(), 'Restored HTML same as original');
        ok(play, 'Library still exposed');
      });
    });
  });

  test("Handlers and Page Numbers", function () {
    stop(1000);
    play.init(function () {
      var $pageCount = $('.chrome .pagecount'),
          $pageNumber = $('.chrome .pagenumber'),
          chrome = $('.chrome')[0];
      start();

      // Confirm our page count
      equals($pageCount.text(), $('.chrome .viewer .grid').length, 'Correct page count');
      // Send clicks if possible
      if (typeof fireunit === 'object') {
        // Button clicks
        fireunit.click($('.chrome .next')[0]);
        equals($pageNumber.text(), 2, 'Correct page number after next button click');
        fireunit.click($('.chrome .next')[0]);
        equals($pageNumber.text(), 3, 'Correct page number after next button click');
        fireunit.click($('.chrome .prev')[0]);
        equals($pageNumber.text(), 2, 'Correct page number after next button click');
        fireunit.click($('.chrome .prev')[0]);
        fireunit.click($('.chrome .prev')[0]);
        fireunit.click($('.chrome .prev')[0]);
        fireunit.click($('.chrome .prev')[0]);
        fireunit.click($('.chrome .prev')[0]);
        equals($pageNumber.text(), 1, 'Correct page number after many previous button click');
      }

      // Manually call next / prev
      play.nextPage();
      equals($pageNumber.text(), 2, 'Correct page number after next button click');
      play.prevPage();
      equals($pageNumber.text(), 1, 'Correct page number after next button click');
    });
  });
});
