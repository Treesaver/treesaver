goog.require('treesaver.template');

$(function() {
  module('template');

  test('class to innerText', function() {
    var div = document.createElement('div'),
        view = {};

    div.innerHTML = '<div class="text">...</div>';
    view = { text: 'hello world' };

    treesaver.template.expand(view, div);
    equals(div.innerHTML, '<div class="text">hello world</div>', 'simple replacement');

    div.innerHTML = '<div class="text">I say: {{text}}</div>';
    view = { text: 'hello world' };

    treesaver.template.expand(view, div);

    equals(div.innerHTML, '<div class="text">I say: hello world</div>', 'replacement with placeholder');

    div.innerHTML = '<div class="text name">{{text}}, nice to meet you, {{name}}</div>';
    view = { text: 'hello', name: 'world'};

    treesaver.template.expand(view, div);

    equals(div.innerHTML, '<div class="text name">hello, nice to meet you, world</div>');
  });

  test('class to known attribute', function() {
    var div = document.createElement('div'),
        view = {};

    div.innerHTML = '<a class="url">some link</a>';
    view = { url: 'http://www.example.org' };

    treesaver.template.expand(view, div);
    equals(div.innerHTML, '<a href="http://www.example.org">some link</a>');

    div.innerHTML = '<a class="url" href="http://www.twitter.com/?status={{url}}>Tweet this</a>';
    view = { url: 'http://www.example.org' };
    treesaver.template.expand(view, div);

    equals(div.innerHTML, '<a href="http://www.twitter.com/?status=http%3A%2F%2Fwww.example.org">Tweet this</a>');
  });

  test('multiple class names', function() {
    var div = document.createElement('div'),
        view = {};

    div.innerHTML = '<a class="url title">...</a>';
    view = { url: 'http://www.example.org', title: 'Click here' };

    treesaver.template.expand(view, div);

    equals(div.innerHTML, '<a href="http://www.example.org">Click here</a>', 'url and innerText expanded correctly.');
  });

  test('template class to array of objects of the same type', function() {
    var div = document.createElement('div'),
        view = {};

    div.innerHTML = ' <div class="toc"><div class="template"><h1 class="title">...</h1></div></div>';
    view = { toc: [ { title: 'First article' }, { title: 'Second article' } ] };
    
    treesaver.template.expand(view, div);

    equals(div.innerHTML, '<div class="toc"><div class="template"><h1 class="title">First article</h1></div><div class="template"><h1 class="title">Second article</h1></div></div>');
  });
});
