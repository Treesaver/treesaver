goog.require('treesaver.ui.toc');

jQuery(function ($) {
  module('toc');
  
  test('empty toc', function () {
    var result = treesaver.ui.toc.parse('');
    equals(result.length, 0, 'Empty TOC parsed correctly.');
  });

  test('toc nesting', function () {
    var result = treesaver.ui.toc.parse(
                    '<article>' +
                      '<h1>Title</h1>' +
                      '<article>' +
                        '<h2>SubTitle</h2>' +
                      '</article>' +
                      '<article>' +
                        '<h2>SubTitle</h2>' +
                      '</article>' +
                    '</article>' +
                    '<article>' + 
                      '<h1>Some other title</h1>' +
                    '</article>');

    equals(result.length, 2, 'extracted two top level TOC entries');
    equals(result[0].children.length, 2, 'first top level article has two sub-articles');
    equals(result[1].children.length, 0, 'second top level article has zero sub-articles');
  });

  test('toc identifiers', function () {
    var result = treesaver.ui.toc.parse(
                    ['<article id="toc">',
                      '<article id="cover">',
                      '</article>',
                     '</article>'].join(''));

    equals(result.length, 1, 'one main article');
    equals(result[0].id, 'toc', 'id set correctly');
    equals(result[0].children.length, 1, 'one sub child');
    equals(result[0].children[0].id, 'cover', 'sub child id set correctly');
  });

  test('microdata association', function () {
    var result = treesaver.ui.toc.parse(
                    ['<article itemscope>',
                      '<h1 itemprop="title">Hello</h1>',
                      '<article itemscope>',
                        '<h2 itemprop="title">World</h2>',
                      '</article>',
                    '</article>',
                    '<article>',
                      '<div itemscope>',
                        '<h3 itemprop="title">Goodbye</h3>',
                        '<p itemprop="byline">Something</p>',
                      '</div>',
                      '<div itemscope>',
                        '<p itemprop="author">Test</p>',
                      '</div>',
                    '</article>'].join(''));

    equals(result.length, 2, 'two articles');
    equals(result[0].children.length, 1, 'first article has one sub-article');
    equals(result[0].meta.length, 1, 'first article has one itemprop');
    equals(result[0].meta[0].title, 'Hello', 'first article has one title itemprop');
    equals(result[0].children[0].meta.length, 1, 'first sub-article has one itemprop');
    equals(result[0].children[0].meta[0].title, 'World', 'first sub-article has one title itemprop');
    equals(result[1].meta.length, 2, 'Second article has two meta-data items');
    equals(result[1].meta[0].title, 'Goodbye', 'second article has one title itemprop');
    equals(result[1].meta[0].byline, 'Something', 'second article has one byline itemprop');
    equals(result[1].meta[1].author, 'Test', 'second article has one author itemprop');
  });

  test('article url (&lta rel="bookmark"&gt; --- other types', function () {
    var result = treesaver.ui.toc.parse([
                      '<article>',
                        '<a rel="self bookmark" href="#">none</a>',
                      '</article>'].join(''));
      equals(result[0].url.length, 1, 'bookmark is correctly identified');
    
      result = treesaver.ui.toc.parse([
                      '<article>',
                        '<a rel="selfbookmark" href="#">none</a>',
                      '</article>'].join(''));
      equals(result[0].url.length, 0, 'bookmark is not identified');
  });

  test('article url (&lt;a rel="bookmark"&gt;)', function () {
    var result = treesaver.ui.toc.parse([
                      '<article>',
                        '<a rel="bookmark" href="section1.html">Section1</a>',
                        '<article>',
                          '<a rel="bookmark" href="article1.html">Article1</a>',
                        '</article>',
                        '<article>',
                          '<a rel="bookmark" href="#identifier">Article2</a>',
                        '</article>',
                      '</article>',
                      '<article>',
                        // This should create two references to the same article
                        '<a rel="bookmark" href="section2.html">Section2</a>',
                        '<a rel="bookmark" href="#another-identifier">Section22</a>',
                      '</article>'].join(''));

    equals(result.length, 2, 'two main articles');
    equals(result[0].url[0], treesaver.network.absoluteURL('section1.html'), 'first section URL set correctly');
    equals(result[0].children.length, 2, 'first article has two subarticles');
    equals(result[0].children[0].url[0], treesaver.network.absoluteURL('article1.html'), 'first article URL set correctly');
    equals(result[0].children[1].url[0], treesaver.network.absoluteURL('#identifier'), 'fragment URL set correctly');
    equals(result[1].url.length, 2, 'second section has two URLs');
/*
  What happens in this case for pagination and article loading:
    <article>
      <h1>Title</h1>
      <p>Some introduction</p>
      <article>
        <h2>Another title</h2>
        <p>Lorem ipsum...</p>
      </article>
      <p>Some closing notes</p>
    </article>

  Does it become:
    <article>
      <h1>Title</h1>
      <p>Some introduction</p>
    </article>
    <article>
      <h2>Another title</h2>
      <p>Lorem ipsum...</p>
    </article>
    <article>
      <p>Some closing thoughts.</p>
    </article>

  (This might actually be how it is displayed to the user.)

  More useful and interesting would be:
    // (url: article-1.html)
    <article>
      <h1>Title</h1>
      <p>Some introduction</p>
      <article data-href="article-1.1.html"/>
      <p>Some closing thoughts.</p>
    </article>

    // (url: article-1.1.html)
    <article>
      <h2>Another title</h2>
      <p>Lorem ipsum...</p>
    </article>

  So the next steps are:
    - generate unique identifiers for each article
      * position and depth
      * meta-data
    - add rel="bookmarks" / data-href as canonical URLS
    - how do we prevent conflicts between user URLs and generated URLs?
    - how does interlinking between two generated articles work? > It doesn't unless you explicitly specify a url.
        <article>
          <h1><a href="article1.html" rel="bookmark">Title</h1>
          <p>Some introduction with a <a href="article1.1.html">link</a> to another</p>
          <article>
            <h2><a href="article1.1.html" rel="bookmark">Another title</a></h2>
            <p>Lorem ipsum</p>
          </article>
        </article>
    - how do we know an article is inline or is external with some meta-data in the TOC?
        * we could come up with some scheme based on anchor links, and always keep the TOC === structure + meta-data (!!!)
        <article id="table-of-contents">
          <header>
            <article>
              <a rel="bookmark" href="#cover">Cover Page</a>
            </article>
            <article>
              <a rel="bookmark" href="#table-of-contents">Table Of Contents</a>
            </article>
            <article>
              
              <article>
              </article>
            </article>
          </header>
        </article>

        <article id="cover">
          (...)
        </article>

        <article id="

        A HTML file can contain one or more articles. Nested articles represent the structure of the document.
*/
  });

  test('flatten TOC', function () {
    var result = treesaver.ui.toc.flatten([
          {
            id: 'top one',
            children: [
              {
                id: 'sub-top one',
                children: [
                  {
                    id: 'sub-sub-top one',
                    children: []
                  }
                ]
              },
              {
                id: 'sub-top two',
                children: []
              }
            ]
          },
          {
            id: 'top two',
            children: []
          }
        ]);
    equals(result.length, 5, 'five articles in total');
    equals(result[0].id, 'top one');
    equals(result[1].id, 'sub-top one');
    equals(result[2].id, 'sub-sub-top one');
    equals(result[3].id, 'sub-top two');
    equals(result[4].id, 'top two');
  });
});
