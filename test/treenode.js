goog.require('treesaver.ui.TreeNode');

$(function () {
  module('treenode');

  test('appendChild', function () {
    var c = new treesaver.ui.TreeNode();

    c.appendChild(1);
    deepEqual(c.children, [1], 'append(1) works');

    c.appendChild(2);
    deepEqual(c.children, [1, 2], 'append(2) works');
  });

  test('removeChild', function () {
    var c = new treesaver.ui.TreeNode();
    c.appendChild(1);
    c.appendChild(2);
    c.appendChild(3);

    c.removeChild(2);
    deepEqual(c.children, [1, 3], 'remove(2) works');

    c.removeChild(1);
    deepEqual(c.children, [3], 'remove(1) works');

    c.removeChild(3);
    deepEqual(c.children, [], 'remove(3) works');

    c.appendChild(8);
    equal(c.removeChild(8), 8, 'remove(8) returns 8');
  });

  test('replaceChild', function () {
    var c = new treesaver.ui.TreeNode();
    c.appendChild(1);
    c.appendChild(2);
    c.appendChild(3);

    c.replaceChild(1, 2);
    deepEqual(c.children, [1, 1, 3], 'replace(1, 2) works');

    c.replaceChild(2, 1);
    deepEqual(c.children, [2, 1, 3], 'replace(2, 1) works on the first occurance');

    c.replaceChild(4, 3);
    deepEqual(c.children, [2, 1, 4], 'replace(4, 3) works on the last element');

    equal(c.replaceChild(5, 2), 2, 'replace(5, 2) returns 2');
  });

  test('insertBefore', function () {
    var c = new treesaver.ui.TreeNode();

    c.appendChild(1);
    c.appendChild(2);
    c.appendChild(3);

    c.insertBefore(5, 1);
    deepEqual(c.children, [5, 1, 2, 3], 'inserted correctly at front');

    c.insertBefore(6, 3);
    deepEqual(c.children, [5, 1, 2, 6, 3], 'insert before last item');
  });

  test('insertAfter', function () {
    var c = new treesaver.ui.TreeNode();

    c.appendChild(1);
    c.appendChild(2);

    c.insertAfter(3, 2);
    deepEqual(c.children, [1, 2, 3], 'inserted correctly at end');

    c.insertAfter(5, 2);
    deepEqual(c.children, [1, 2, 5, 3], 'inserted correctly after');
  });

  test('parent', function () {
    var a = new treesaver.ui.TreeNode(),
        b = new treesaver.ui.TreeNode(),
        c = new treesaver.ui.TreeNode(),
        d = new treesaver.ui.TreeNode();
    a.appendChild(b);
    a.appendChild(c);

    equal(a.parent, null, 'a parent is null');
    // strictEqual(c.parent, a); does something funky
    ok(b.parent === a, 'b parent is a');
    ok(c.parent === a, 'c parent is a');

    a.replaceChild(d, b);
    ok(d.parent === a, 'd parent is a');
    ok(b.parent === null, 'b parent is null');

    a.removeChild(d);
    ok(d.parent === null, 'd parent is null');
  });
});
