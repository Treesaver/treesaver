treesaver.addListener(document, 'treesaver.index.loaded', function (event) {
  var index = event.index,
      one = document.getElementsByClassName('one')[0],
      two = document.getElementsByClassName('two')[0],
      three = document.getElementsByClassName('three')[0],
      dynamic = document.getElementsByClassName('dynamic')[0],
      counter = 4;

  one.addEventListener('click', function () {
    index.appendChild(new treesaver.Document('one.html', {
      title: 'Article One'
    }));
    index.update();
  });

  two.addEventListener('click', function () {
    index.appendChild(new treesaver.Document('two.html', {
      title: 'Article Two'
    }));
    index.update();
  });

  three.addEventListener('click', function () {
    index.appendChild(new treesaver.Document('three.html', {
      title: 'Article Three'
    }));
    index.update();
  });

  dynamic.addEventListener('click', function () {
    var doc = new treesaver.Document('dynamic_' + counter + '.html', {
      title: 'Article ' + counter
    });

    // Set loaded to true so Treesaver does not attempt to
    // download our "fake" dynamic page.
    doc.loaded = true;

    // Manually assign the articles by parsing a HTML string. You can dynamically retrieve this
    // through an XHR request.
    doc.setArticles(doc.parse('<article><h1>Article ' + counter + '</h1><p>This is article number: ' + counter + '</p></article>'));

    counter += 1;

    // Append the document as usual
    index.appendChild(doc);

    // Update the index
    index.update();
  });
});
