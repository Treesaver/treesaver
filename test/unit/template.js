goog.require('treesaver.template');

$(function() {
  module('template');

  /**
   * With some minor modifications, taken from: http://d.hatena.ne.jp/sandai/20100908/p1 
   */
  function isEqualNode(originalNode, comparedNode) {
    var oNodes, cNodes, seach;
    if (originalNode === comparedNode) return true;
    if (originalNode.childNodes.length !== comparedNode.childNodes.length) {
      return false;
    }
    oNodes = [originalNode];
    cNodes = [comparedNode];

    search = function () {
      var oretChildren = [],
          cretChildren = [];
      for (var i = 0; i < oNodes.length; i++) {
        //
        var oAttrs = oNodes[i].attributes || [];
        var cAttrs = cNodes[i].attributes || [];
        if (oAttrs.length !== 0 || cAttrs.length !== 0) {
          if (oAttrs.length !== cAttrs.length) {
            return false;
          } else {
            for (var j = 0; j < oAttrs.length; j++) {
              if (oAttrs[j].nodeValue && oAttrs[j].nodeValue !== cAttrs.getNamedItem(oAttrs[j].nodeName).nodeValue) {
                return false;
              }
            }
          }
        }
        var ochildren = oNodes[i].childNodes;
        var cchildren = cNodes[i].childNodes;
        if (ochildren.length !== 0 || cchildren.length !== 0) {
          if (ochildren.length !== cchildren.length) {
            return false;
          } else {
            for (var k = 0; k < ochildren.length; k++) {
              oretChildren.push(ochildren[k]);
              cretChildren.push(cchildren[k]);
            }
          }
        }
      }
      if (oretChildren.length) {
        oNodes = oretChildren.slice();
        cNodes = cretChildren.slice();
        return search();
      } else {
        return true;
      }
    };
    return search();
  }


  function htmlEquals(a, b) {
    var x = document.createElement('div'),
        y = document.createElement('div');

    x.innerHTML = a;
    y.innerHTML = b;

    if (typeof x.isEqualNode !== 'undefined') {
      return x.isEqualNode(y);
    }
    else {
      return isEqualNode(x, y);
    }
  };

  test('class to innerText', function() {
    var div = document.createElement('div'),
        view = {};

    div.innerHTML = '<div data-bind="text">...</div>';
    view = { text: 'hello world' };

    treesaver.template.expand(view, div);
    ok(htmlEquals(div.innerHTML, '<div data-bind="text">hello world</div>'), 'simple replacement');

    div.innerHTML = '<div data-bind="text">I say: {{text}}</div>';
    view = { text: 'hello world' };

    treesaver.template.expand(view, div);

    ok(htmlEquals(div.innerHTML, '<div data-bind="text">I say: hello world</div>'), 'replacement with placeholder');

    div.innerHTML = '<div data-bind="text name">{{text}}, nice to meet you, {{name}}</div>';
    view = { text: 'hello', name: 'world'};

    treesaver.template.expand(view, div);

    ok(htmlEquals(div.innerHTML, '<div data-bind="text name">hello, nice to meet you, world</div>'), 'multiple replacements');
  });

  test('nested identical classes', function() {
    var div = document.createElement('div'),
        view = {};

    view = { test: 'hello world' };

    div.innerHTML = '<div data-bind="test"><span data-bind="test">...</span></div>';

    treesaver.template.expand(view, div);
    // Is this correct? Will result in div[data-bind].innerText = 'hello world'
    // and span[data-bind].innerText = 'hello world', effectively ignoring the
    // second replacement.
    ok(htmlEquals(div.innerHTML, '<div data-bind="test">hello world</div>'));
  });

  test('innerText and attribute', function() {
    var div = document.createElement('div'),
        view = {};

    view = {
      url: 'http://www.example.org/',
      title: 'example'
    };

    div.innerHTML = '<a data-bind="url:href title"></a>';

    treesaver.template.expand(view, div);

    ok(htmlEquals(div.innerHTML, '<a data-bind="url:href title" href="http://www.example.org/">example</a>'));
  });

  test('nested data', function() {
    var div = document.createElement('div'),
        view = {};

    view = {
      article: {
        title: 'Something',
        url: 'http://www.example.org/',
        data: {
          numpages: 22,
          numimages: 8,
          url: 'http://www.example.org/2/',
          title: 'Other'
        }
      }
    };

    div.innerHTML = '<div data-bind="article">' +
                      '<h1><a data-bind="url:href title">...</a></h1>' +
                      '<div data-bind="data">' +
                        '<p>Total pages: <span data-bind="numpages">0</span>, total images: <span data-bind="numimages">0</span>, at <a data-bind="url:href title">...</a></p>' +
                      '</div>' +
                    '</div>';

    treesaver.template.expand(view, div);

    ok(htmlEquals(div.innerHTML, '<div data-bind="article"><h1><a href="http://www.example.org/" data-bind="url:href title">Something</a></h1><div data-bind="data"><p>Total pages: <span data-bind="numpages">22</span>, total images: <span data-bind="numimages">8</span>, at <a href="http://www.example.org/2/" data-bind="url:href title">Other</a></p></div></div>'));
  });

  test('class to known attribute', function() {
    var div = document.createElement('div'),
        view = {};

    div.innerHTML = '<a data-bind="url:href">some link</a>';
    view = { url: 'http://www.example.org' };

    treesaver.template.expand(view, div);
    ok(htmlEquals(div.innerHTML, '<a href="http://www.example.org" data-bind="url:href">some link</a>'));

    div.innerHTML = '<a data-bind="url:href" data-href="http://www.twitter.com/?status={{url}}">Tweet this</a>';
    view = { url: 'http://www.example.org' };
    treesaver.template.expand(view, div);

    ok(htmlEquals(div.innerHTML, '<a href="http://www.twitter.com/?status=http%3A%2F%2Fwww.example.org" data-bind="url:href" data-href="http://www.twitter.com/?status={{url}}">Tweet this</a>'));
  });

  test('multiple class names', function() {
    var div = document.createElement('div'),
        view = {};

    div.innerHTML = '<a data-bind="url:href title">...</a>';
    view = { url: 'http://www.example.org', title: 'Click here' };

    treesaver.template.expand(view, div);

    ok(htmlEquals(div.innerHTML, '<a href="http://www.example.org" data-bind="url:href title">Click here</a>'), 'url and innerText expanded correctly.');
  });

  test('template class to array of objects of the same type', function() {
    var div = document.createElement('div'),
        view = {};

    div.innerHTML = '<div data-bind="toc"><div><h1 data-bind="title">...</h1><p data-bind="byline">...</p></div></div>';
    view = { toc: [ { title: 'First article', byline: '1' }, { title: 'Second article', byline: '2' } ] };
    
    treesaver.template.expand(view, div);

    ok(htmlEquals(div.innerHTML, '<div data-bind="toc"><div><h1 data-bind="title">First article</h1><p data-bind="byline">1</p></div><div><h1 data-bind="title">Second article</h1><p data-bind="byline">2</p></div></div>'));
  });


  test('escaping', function() {
    var div = document.createElement('div'),
        view = {
          html: '<>',
          squote: "'",
          dquote: '"',
          amp: '&',
          damp: '&amp;',
          url: 'http://www.example.org/some file?="something"'
        };

    div.innerHTML = '<span data-bind="html">{{html}}</span>';
    treesaver.template.expand(view, div);
    ok(htmlEquals(div.innerHTML, '<span data-bind="html">&lt;&gt;</span>'), 'common characters escaped properly');

    div.innerHTML = '<span data-bind="amp">{{amp}}</span>';
    treesaver.template.expand(view, div);
    ok(htmlEquals(div.innerHTML, '<span data-bind="amp">&amp;</span>'), 'ampersand is escaped properly');

    div.innerHTML = '<span data-bind="damp">{{damp}}</span>';
    treesaver.template.expand(view, div);
    ok(htmlEquals(div.innerHTML, '<span data-bind="damp">&amp;</span>'), 'entities are not escaped twice');

    div.innerHTML = '<span data-bind="dquote:test squote:test" test="{{squote}}{{dquote}}">hello world</span>';
    treesaver.template.expand(view, div);
    ok(htmlEquals(div.innerHTML, '<span data-bind="dquote:test squote:test" test="\'&quot;">hello world</span>'), 'non mapped attribute values are escaped properly');

    div.innerHTML = '<a data-href="http://www.twitter.com/?status={{url}}" data-bind="url:href">click here</a>';
    treesaver.template.expand(view, div);
    ok(htmlEquals(div.innerHTML, '<a href="http://www.twitter.com/?status=http%3A%2F%2Fwww.example.org%2Fsome%20file%3F%3D%22something%22" data-href="http://www.twitter.com/?status={{url}}" data-bind="url:href">click here</a>'), 'mapped templated attribute values are escaped properly');

    div.innerHTML = '<a data-bind="url:title">click here</a>';
    treesaver.template.expand(view, div);
    ok(htmlEquals(div.innerHTML, '<a data-bind="url:title" title="http://www.example.org/some file?=&quot;something&quot;">click here</a>'), 'mapped attribute values are escaped properly');
  });
});
