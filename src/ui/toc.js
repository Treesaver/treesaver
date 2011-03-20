goog.provide('treesaver.ui.toc');

goog.require('treesaver.array');
goog.require('treesaver.microdata');

treesaver.ui.toc.parse = function (html) {
  var el = document.createElement('div'),
      result = [];

  el.innerHTML = html;
  treesaver.ui.toc.domWalker(el, null, result);
  return result;
};

treesaver.ui.toc.domWalker = function (node, parentNode, result) {
  if (node.nodeType === 1) {
    if (node.nodeName === 'ARTICLE') {
      var parent = {
          id: node.id,
          children: [],
          meta: [],
          url: []
        },
        metaItems = treesaver.microdata.getItems(null, node);

      // Querying for microdata items on an article will also return
      // the microdata items for its subarticles. To prevent these
      // from being listed we filter them out explicitly. Perhaps we
      // could cache them at a later point.
      metaItems.forEach(function (item) {
        // Only set item when the itemscope is set on the article node,
        // or if the article node is a direct ancestor of the itemscope
        // node.
        if (item === node || (item.nodeName !== 'ARTICLE' && treesaver.dom.getAncestor(item, 'ARTICLE') === node)) {
          parent.meta.push(treesaver.microdata.normalizeItem(treesaver.microdata.getObject(item)));
        }
      });

      result.push(parent);

      treesaver.array.toArray(node.childNodes).forEach(function (c) {
        treesaver.ui.toc.domWalker(c, parent, parent.children);
      });
    } else if (node.nodeName === 'A' && treesaver.dom.hasAttr(node, 'rel') && node.getAttribute('rel').split(' ').indexOf('bookmark') !== -1) {
      parentNode.url.push(treesaver.network.absoluteURL(node.href));
    } else {
      treesaver.array.toArray(node.childNodes).forEach(function (c) {
        treesaver.ui.toc.domWalker(c, parentNode, result);
      });      
    }
  }
};

treesaver.ui.toc.flattenAux_ = function (article, result) {
  result.push(article);
  article.children.forEach(function (child) {
    treesaver.ui.toc.flattenAux_(child, result);
  });
};

treesaver.ui.toc.flatten = function (articles) {
  var result = [];

  articles.forEach(function (article) {
    treesaver.ui.toc.flattenAux_(article, result);
  });
  return result;
};
