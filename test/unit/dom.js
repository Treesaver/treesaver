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

  test('getElementsByClassName', function () {
    var div = document.createElement('div');
    div.innerHTML = '<p class="one"><span class="one inner"></span></p>';
    div.innerHTML += '<p class="two"><span class="two inner"></span></p>';

    equals(treesaver.dom.getElementsByClassName('one', div).length, 2);
    equals(treesaver.dom.getElementsByClassName('inner', div).length, 2);
    equals(treesaver.dom.getElementsByClassName('outer', div).length, 0);
  });

  test('createDocumentFragmentFromHTML', function () {
    equals(treesaver.dom.createDocumentFragmentFromHTML('<p>hello world</p>').childNodes.length, 1);
    equals(treesaver.dom.createDocumentFragmentFromHTML('<p>hello</p><p>world</p>').childNodes.length, 2);
  });

  test('getElementsByProperty', function () {
    var div = document.createElement('div');
    div.innerHTML = '<p class="one" itemscope><span class="one inner"></span></p>';
    div.innerHTML += '<p class="two"><span class="two inner"></span></p>';
    div.innerHTML += '<p type="text/x-treesaver-template">hello world</p>';

    equals(treesaver.dom.getElementsByProperty('class', null, null, div).length, 4);
    equals(treesaver.dom.getElementsByProperty('class', 'one', null, div).length, 2);
    equals(treesaver.dom.getElementsByProperty('class', 'one', 'p', div).length, 1);
    equals(treesaver.dom.getElementsByProperty('itemscope', null, null, div).length, 1, 'Property without value');
    equals(treesaver.dom.getElementsByProperty('type', null, null, div).length, 1);
  });

  test('getElementsByQuery', function () {
    var div = document.createElement('div');
    div.innerHTML = '<p>Hello <strong class="test">world</p>';

    equals(treesaver.dom.getElementsByQuery('p', div).length, 1);
    equals(treesaver.dom.getElementsByQuery('p, strong', div).length, 2);
    equals(treesaver.dom.getElementsByQuery('p,strong', div).length, 2);
    equals(treesaver.dom.getElementsByQuery('.test', div).length, 1);
    equals(treesaver.dom.getElementsByQuery('.test, p', div).length, 2);
    equals(treesaver.dom.getElementsByQuery('.test, p, strong, p', div).length, 2);
  });

  test('getAncestor', function () {
    var div = document.createElement('div');
    div.innerHTML = '<article id="top"><article id="article"><p id="text">Hello World</p></article></article>';

    var p = treesaver.dom.getElementsByTagName('p', div)[0];

    equals(treesaver.dom.getAncestor(p, 'ARTICLE').id, 'article', 'closest ancestor returned');
    equals(treesaver.dom.getAncestor(p, 'article').id, 'article', 'closest ancestor returned (lowercase)');
    equals(treesaver.dom.getAncestor(treesaver.dom.getAncestor(p, 'article'), 'article').id, 'top', 'retrieved two nearest ancestors');
    equals(treesaver.dom.getAncestor(p, 'body'), null, 'correctly returned null on disconnected node');
  });
});
