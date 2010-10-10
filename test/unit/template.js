goog.require('treesaver.template');

$(function() {
  module('template');

  test('class to innerHTML', function() {
    var div = document.createElement('div'),
        view = {};

    div.innerHTML = '<div class="text">...</div>';
    view = { text: 'hello world' };

    treesaver.template.expand(view, {}, div);
    equals(div.innerHTML, '<div class="text">hello world</div>', 'simple replacement');

    div.innerHTML = '<div class="text">I say: {{text}}</div>';
    view = { text: 'hello world' };

    treesaver.template.expand(view, {}, div);

    equals(div.innerHTML, '<div class="text">I say: hello world</div>', 'replacement with placeholder');

    div.innerHTML = '<div class="text name">{{text}}, nice to meet you, {{name}}</div>';
    view = { text: 'hello', name: 'world'};

    treesaver.template.expand(view, {}, div);

    equals(div.innerHTML, '<div class="text name">hello, nice to meet you, world</div>');
  });

  test('nested identical classes', function() {
    var div = document.createElement('div'),
        view = {};

    view = { test: 'hello world' };

    div.innerHTML = '<div class="test"><span class="test">...</span></div>';

    treesaver.template.expand(view, {}, div);
    // Is this correct? Will result in div[class].innerHTML = 'hello world'
    // and span[class].innerHTML = 'hello world', effectively ignoring the
    // second replacement.
    equals(div.innerHTML, '<div class="test">hello world</div>');
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

    div.innerHTML = '<div class="article">' +
                      '<h1><a class="url title">...</a></h1>' +
                      '<div class="data">' +
                        '<p>Total pages: <span class="numpages">0</span>, total images: <span class="numimages">0</span>, at <a class="url title">...</a></p>' +
                      '</div>' +
                    '</div>';

    treesaver.template.expand(view, { url: 'href' }, div);

    equals(div.innerHTML, '<div class="article"><h1><a href="http://www.example.org/" class="url title">Something</a></h1><div class="data"><p>Total pages: <span class="numpages">22</span>, total images: <span class="numimages">8</span>, at <a href="http://www.example.org/2/" class="url title">Other</a></p></div></div>');
  });

  test('class to known attribute', function() {
    var div = document.createElement('div'),
        view = {};

    div.innerHTML = '<a class="url">some link</a>';
    view = { url: 'http://www.example.org' };

    treesaver.template.expand(view, {url: 'href'}, div);
    equals(div.innerHTML, '<a href="http://www.example.org" class="url">some link</a>');

    div.innerHTML = '<a class="url" href="http://www.twitter.com/?status={{url}}">Tweet this</a>';
    view = { url: 'http://www.example.org' };
    treesaver.template.expand(view, { url: 'href'}, div);

    equals(div.innerHTML, '<a class="url" href="http://www.twitter.com/?status=http%3A%2F%2Fwww.example.org">Tweet this</a>');
  });

  test('multiple class names', function() {
    var div = document.createElement('div'),
        view = {};

    div.innerHTML = '<a class="url title">...</a>';
    view = { url: 'http://www.example.org', title: 'Click here' };

    treesaver.template.expand(view, { url: 'href' }, div);

    equals(div.innerHTML, '<a href="http://www.example.org" class="url title">Click here</a>', 'url and innerText expanded correctly.');
  });

  test('template class to array of objects of the same type', function() {
    var div = document.createElement('div'),
        view = {};

    div.innerHTML = '<div class="toc"><div class="template"><h1 class="title">...</h1><p class="byline">...</p></div></div>';
    view = { toc: [ { title: 'First article', byline: '1' }, { title: 'Second article', byline: '2' } ] };
    
    treesaver.template.expand(view, {}, div);

    equals(div.innerHTML, '<div class="toc"><div class="template"><h1 class="title">First article</h1><p class="byline">1</p></div><div class="template"><h1 class="title">Second article</h1><p class="byline">2</p></div></div>');
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

    div.innerHTML = '<span class="html squote dquote amp damp">{{html}}{{squote}}{{dquote}}{{amp}}{{damp}}</span>';
    treesaver.template.expand(view, {}, div);
    equals(div.innerHTML, '<span class="html squote dquote amp damp">&lt;&gt;\'"&amp;&amp;</span>', 'common characters escaped properly');

    div.innerHTML = '<span class="dquote squote" title="{{squote}}{{dquote}}">hello world</span>';
    treesaver.template.expand(view, { dquote: 'title', squote: 'title' }, div);
    equals(div.innerHTML, '<span class="dquote squote" title="\'&quot;">hello world</span>', 'non mapped attribute values are escaped properly');
    
    div.innerHTML = '<a class="url">click here</a>';
    treesaver.template.expand(view, { url: 'href' }, div);
    equals(div.innerHTML, '<a href="http://www.example.org/some%20file?=%22something%22" class="url">click here</a>', 'mapped templated attribute values are escaped properly');

    div.innerHTML = '<a class="url" title="{{url}}">click here</a>';
    treesaver.template.expand(view, { url: 'title' }, div);
    equals(div.innerHTML, '<a class="url" title="http://www.example.org/some file?=&quot;something&quot;">click here</a>', 'mapped attribute values are escaped properly');
  });
});
