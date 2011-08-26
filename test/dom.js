goog.require('treesaver.dom');

$(function() {
  module('dom', {
    setup: function () {
    },
    teardown: function () {
    }
  });

  test('className helpers', function () {
    var div = document.createElement('div');

    equals(treesaver.dom.classes(div).length, 0, 'classes: Unset className');

    treesaver.dom.addClass(div, 'test');

    equals(treesaver.dom.classes(div).length, 1, 'classes: Single class');
    ok(treesaver.dom.hasClass(div, 'test'), 'hasClass: Single class');
    ok(!treesaver.dom.hasClass(div, 'bogus'), 'hasClass: Single class failure');

    treesaver.dom.removeClass(div, 'test');

    equals(treesaver.dom.classes(div).length, 0, 'classes: Removed class');
    ok(!treesaver.dom.hasClass(div, 'test'), 'hasClass: Removed class');
  });

  test('hasAttr', function () {
    var div = document.createElement('div'),
        attr = document.createAttribute('width');

    div.setAttributeNode(attr);
    
    ok(!treesaver.dom.hasAttr(div, 'test'), 'Non existing attribute');
    ok(treesaver.dom.hasAttr(div, 'width'), 'Property exists');
  });

  test('querySelectorAll', function () {
    var div = document.createElement('div');
    div.innerHTML = '<p class="one"><span class="one inner"></span></p>';
    div.innerHTML += '<p class="two"><span class="two inner"></span></p>';

    // Converted from getElementsByClassName
    equals(treesaver.dom.querySelectorAll('.one', div).length, 2);
    equals(treesaver.dom.querySelectorAll('.inner', div).length, 2);
    equals(treesaver.dom.querySelectorAll('.outer', div).length, 0);

    // Converted from getElementsByProperty
    div.innerHTML = '<p class="one" itemscope><span class="one inner"></span></p>';
    div.innerHTML += '<p class="two"><span class="two inner"></span></p>';
    div.innerHTML += '<p type="text/x-treesaver-template">hello world</p>';

    equals(treesaver.dom.querySelectorAll('[class]', div).length, 4);
    equals(treesaver.dom.querySelectorAll('[class~=one]', div).length, 2);
    equals(treesaver.dom.querySelectorAll('p[class=one]', div).length, 1);
    equals(treesaver.dom.querySelectorAll('[itemscope]', div).length, 1, 'Property without value');
    equals(treesaver.dom.querySelectorAll('[type]', div).length, 1);

    // Converted from getElementsByQuery
    div.innerHTML = '<p>Hello <strong class="test">world</p>';

    equals(treesaver.dom.querySelectorAll('p', div).length, 1);
    equals(treesaver.dom.querySelectorAll('p, strong', div).length, 2);
    equals(treesaver.dom.querySelectorAll('p,strong', div).length, 2);
    equals(treesaver.dom.querySelectorAll('.test', div).length, 1);
    equals(treesaver.dom.querySelectorAll('.test, p', div).length, 2);
    equals(treesaver.dom.querySelectorAll('.test, p, strong, p', div).length, 2);
  });

  test('createDocumentFragmentFromHTML', function () {
    equals(treesaver.dom.createDocumentFragmentFromHTML('<p>hello world</p>').childNodes.length, 1);
    equals(treesaver.dom.createDocumentFragmentFromHTML('<p>hello</p><p>world</p>').childNodes.length, 2);
  });

  test('getElementsByProperty', function () {
    var div = document.createElement('div');
  });

  test('getElementsByQuery', function () {
    var div = document.createElement('div');
  });
});
