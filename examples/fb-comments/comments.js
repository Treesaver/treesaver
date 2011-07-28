var currentDocument = null,
    sidebarActive = false,
    sidebarContent = null;

treesaver.addListener(document, 'treesaver.documentchanged', function (e) {
  var doc = e.document;

  if (currentDocument !== doc) {
    currentDocument = doc;
    setSidebarContent();
  }
});

function setSidebarContent() {
  // Don't do anything if the sidebar is active
  if (sidebarActive) {
    // TODO: Set href to currentDocument.url
    sidebarContent.innerHTML = '<fb:comments href="http://example.com/" num_posts="10" width="350"></fb:comments>';
    FB.init();
    FB.XFBML.parse(sidebarContent);
  }
}

treesaver.addListener(document, 'treesaver.sidebaractive', function (e) {
  var sidebar = e.sidebar,
      // FIXME: this does not work in IE < 9
      content = sidebar.getElementsByClassName('content')[0];

  sidebarContent = content;
  sidebarActive = true;
  setSidebarContent();
});

treesaver.addListener(document, 'treesaver.sidebarinactive', function (sidebar) {
  var sidebar = e.sidebar,
      // FIXME: this does not work in IE < 9
      content = sidebar.getElementsByClassName('content')[0];

  content.innerHTML = '';
  sidebarActive = false;
});
