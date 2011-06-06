treesaver.addListener(document, treesaver.ui.Index.events.LOADED, function (event) {
  var index = event.index,
      one = document.getElementsByClassName('one')[0],
      two = document.getElementsByClassName('two')[0],
      three = document.getElementsByClassName('three')[0],
      dynamic = document.getElementsByClassName('dynamic')[0],
      counter = 4;

  one.addEventListener('click', function () {
    index.appendChild(new treesaver.ui.Document('one.html', {
      title: 'Article One'
    }));
    index.invalidate();
  });

  two.addEventListener('click', function () {
    index.appendChild(new treesaver.ui.Document('two.html', {
      title: 'Article Two'
    }));
    index.invalidate();
  });

  three.addEventListener('click', function () {
    index.appendChild(new treesaver.ui.Document('three.html', {
      title: 'Article Three'
    }));
    index.invalidate();
  });

  dynamic.addEventListener('click', function () {
    var doc = new treesaver.ui.Document('dynamic_' + counter + '.html', {
      title: 'Article ' + counter
    });

    // Set loaded to true so Treesaver does not attempt to
    // download our "fake" dynamic page.
    doc.loaded = true;

    // Manually assign the articles by parsing a HTML string. You can dynamically retrieve this
    // through an XHR request.
    doc.articles = doc.parse('<article><h1>Article ' + counter + '</h1><p>This is article number: ' + counter + '</p></article>');

    counter += 1;

    // Append the document as usual
    index.appendChild(doc);

    // Invalidate the index
    index.invalidate();
  });
});
