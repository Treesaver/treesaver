goog.require('treesaver.microdata');

$(function () {
  module('microdata', {
    setup: function () {
      $.ajax({
        async: false,
        url: '../assets/microdata.html',
        success: function (data) {
          if (data) {
            var container = document.createElement('div');
            document.body.appendChild(container);
            container.className = 'microdata';
            container.innerHTML = data;
          }
        }
      });
    },
    teardown: function () {
      $('.microdata').remove();
    }
  });

  test('getItems availability', function () {
    ok('getItems' in document, 'document.getItems available.');
  });

  test('getItems typed', function () {
    var items = [];

    items = document.getItems('http://www.example.org/ns/#1');

    ok(items.length === 1, 'Get a single typed item');

    items = document.getItems('http://www.example.org/ns/#2');

    ok(items.length === 2, 'Get two typed items');

    items = document.getItems('http://www.example.org/ns/#1 http://www.example.org/ns/#2');

    ok(items.length === 3, 'Get multiple mixed typed items');

    items = document.getItems('http://www.example.org/ns/#3');

    ok(items.length === 1, 'Only top level typed items are returned.');

    items = document.getItems('http://www.example.org/ns/#3    http://www.example.org/ns/#2  ');

    ok(items.length === 3, 'Strange whitespace in typeNames.');
  });

  test('getItems untyped', function () {
      var items = [];
  
      items = document.getItems();

      ok(items.length >= 1, 'At least one untyped item in the document');

      items = document.getItems('');

      ok(items.length >= 1, 'Empty typeNames string');

      items = document.getItems('  ');

      ok(items.length >= 1, 'Whitespace typeNames string');
  });

  test('duplicate', function () {
    var items = [];
    items = document.getItems('http://www.example.org/ns/#dup');
    ok(items.length === 1, 'Returns one item');
    ok(items[0].properties.length === 3, 'Has three property');
  });

  test('nested items', function () {
    var items = [];

    items = document.getItems('http://www.example.org/ns/#nested');

    ok(items.length === 1, 'level one has one item');
    ok(items[0].properties.length === 2, 'level one has two properties');
    ok(items[0].properties[0].properties.length === 2, 'level two has two properties');
    ok(items[0].properties[0].properties[0].properties.length === 2, 'level three has three properties');
    ok(items[0].properties[0].properties[0].properties[0].properties.length === 1, 'level four has one property');
  });

  test('itemref', function () {
      var items = [];
    
      items = document.getItems('http://www.example.org/ns/#itemref');

      ok(items.length === 1, 'itemref exists');

      ok(items[0].properties.length === 2, 'Item has two properties');

      ok(items[0].properties[1].properties.length === 2, 'Sub item has two properties');
  });

  test('ancestor removal', function () {
    var items = [];
    items = document.getItems('http://www.example.org/ns/#ancestor');

    ok(items.length === 1, 'ancestor is correctly removed');  
  });

  test('deep item properties', function () {
    var items = [];

    items = document.getItems('http://www.example.org/ns/#deep');

    ok(items.length === 1, 'one item returned');
    ok(items[0].properties.length === 2, 'item has two properties');
  });

  test('item value', function () {
    var items = [];

    items = document.getItems('http://www.example.org/ns/#textcontent');

    ok(items.length === 1, 'one item returned');
    ok(items[0].properties[0].itemProp === 'hello', 'itemProp is set correctly');
    ok(items[0].properties[0].itemValue === 'world', 'itemValue is set correctly');

    items = document.getItems('http://www.example.org/ns/#anchor');
    ok(items.length === 1, 'one item returned');
    ok(items[0].properties[0].itemProp === 'anchor', 'itemprop === anchor');
    ok(items[0].properties[0].itemValue === 'http://www.google.com/', 'anchor href is read correctly');

    items = document.getItems('http://www.example.org/ns/#name');
    ok(items.length === 2, 'two items returned');
    ok(items[0].properties[0].itemProp === 'name', 'itemprop === name');
    ok(items[0].properties[0].itemValue === 'Elizabeth', 'itemValue === Elizabeth');
    ok(items[1].properties[0].itemProp === 'name', 'itemprop === name#2');
    ok(items[1].properties[0].itemValue === 'Daniel', 'itemValue === Daniel');

    items = document.getItems('http://www.example.org/ns/#multiprop');
    ok(items.length === 1, 'one item returned');
    ok(items[0].properties.length === 3, 'item has three properties');
    ok(items[0].properties[0].itemValue === 'Neil', 'name property');
    ok(items[0].properties[1].itemValue === 'Four Parts Water', 'band property');
    ok(items[0].properties[2].itemValue === 'British', 'nationality property');

    items = document.getItems('http://www.example.org/ns/#image');
    ok(items.length === 1, 'on item returned');
    ok(items[0].properties[0].itemProp === 'image', 'itemprop === image');
    ok(items[0].properties[0].itemValue === 'http://www.google.com/google-logo.png', 'correct img@src value');        
  });
});
