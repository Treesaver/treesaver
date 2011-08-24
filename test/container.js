goog.require('treesaver.layout.Container');

$(function() {
  module('container');

  test('Construction & stretching', function () {
    var containerNode = document.createElement('div'),
        container;

    document.body.appendChild(containerNode);
    containerNode.setAttribute('data-sizes', 'one two three');
    containerNode.style.height = "550px";
    containerNode.className = "container fixed";

    container = new treesaver.layout.Container(containerNode, 800);

    ok(container, 'Object constructed');
    ok(!container.flexible, 'Fixed flag detected');
    equals(container.h, 550, 'Height computed');
    equals(container.delta, 250, 'Computed delta');
    equals(container.sizes.length, 3, 'Sizes array');

    container.stretch(1000);
    equals(container.h, 550, 'Fixed container does not stretch');

    container.flexible = true;

    container.stretch(1000);
    equals(container.h, 750, 'Flexible container stretches');

    document.body.removeChild(containerNode);
  });
});
