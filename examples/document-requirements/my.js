// This should be replaced by `treesaver.ready`
treesaver.addListener(document, 'treesaver.index.loaded', function () {
  var button = document.getElementById('toggle-status');

  treesaver.addListener(button, 'click', function () {
    treesaver.network.setOnlineStatus(!treesaver.network.isOnline());
    if (treesaver.network.isOnline()) {
      alert('Treesaver is now online!');
    } else {
      alert('Treesaver is now offline!');
    }
  });
});
