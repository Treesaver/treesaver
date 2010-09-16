goog.require('treesaver.network');
goog.require('treesaver.scheduler');

$(function() {
  module('network', {
    setup: function () {
    },
    teardown: function () {
    }
  });

  test('get', function () {
    stop(4000);
    expect(2);
    treesaver.network.get('../assets/resources.html', function (text) {
      ok(true, 'Callback received');
      ok(text, 'Text received');
      start();
    });
  });

  test('get 404', function () {
    stop(4000);
    expect(2);
    treesaver.network.get('../assets/404.html', function (text) {
      ok(true, 'Callback received on 404');
      ok(!text, 'No text received on 404');
      start();
    });
  });

  //test('xhrGet X-domain', function () {
    //expect(2);
    //stop(2000);
    //treesaver.xhrGet('http://google.com/', function (text) {
      //ok(true, 'Callback received');
      //ok(!text, 'No text received');
      //start();
    //});
  //});
});
