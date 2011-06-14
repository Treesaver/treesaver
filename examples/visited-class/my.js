treesaver.addListener(document, 'treesaver.index.loaded', function (event) {
  var index = event.index;

  treesaver.addListener(document, 'treesaver.documentchanged', function (e) {
    var doc = e.document;

    // Set a "visited" flag. This flag could have any name,
    // as long as it matches what you expect in your template.
    doc.getMeta().visited = true;

    // Tell the index to update, which will rerender the TOC
    index.update();
  });
});
