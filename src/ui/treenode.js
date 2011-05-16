goog.provide('treesaver.ui.TreeNode');

/**
 * TreeNode to represent a node in the (hierarchical) index. Every document inherits
 * from TreeNode, as well as the index itself.
 * @constructor
 */
treesaver.ui.TreeNode = function () {
  this.children = [];
  this.parent = null;
};

/**
 * Appends a child to this node.
 * @param {!treesaver.ui.TreeNode} child
 * @return {!treesaver.ui.TreeNode} The added child.
 */
treesaver.ui.TreeNode.prototype.appendChild = function (child) {
  child.parent = this;
  this.children.push(child);
  return child;
};

/**
 * Replaces a child of this node with another.
 * @param {!treesaver.ui.TreeNode} newChild
 * @param {!treesaver.ui.TreeNode} oldChild
 * @return {treesaver.ui.TreeNode} The old child, or null.
 */
treesaver.ui.TreeNode.prototype.replaceChild = function (newChild, oldChild) {
  var index = this.children.indexOf(oldChild);
  if (index !== -1) {
    newChild.parent = oldChild.parent;
    oldChild.parent = null;
    return this.children.splice(index, 1, newChild)[0];
  }
  return null;
};

/**
 * Insert a new child node before the reference node.
 * @param {!treesaver.ui.TreeNode} newChild
 * @param {!treesaver.ui.TreeNode} reference
 * @return {!treesaver.ui.TreeNode} The new child
 */
treesaver.ui.TreeNode.prototype.insertBefore = function (newChild, reference) {
  var index = this.children.indexOf(reference);
  newChild.parent = this;
  if (index === 0) {
    this.children.unshift(newChild);
  } else if (index > 1) {
    this.children.splice(index, 0, newChild);
  }
  return newChild;
};

/**
 * Insert a new child node after the reference node.
 * @param {!treesaver.ui.TreeNode} newChild
 * @param {!treesaver.ui.TreeNode} reference
 * @return {!treesaver.ui.TreeNode} The new child
 */
treesaver.ui.TreeNode.prototype.insertAfter = function (newChild, reference) {
  var index = this.children.indexOf(reference);
  newChild.parent = this;
  if (index === this.children.length) {
    this.children.push(newChild);
  } else if (index !== -1) {
    this.children.splice(index + 1, 0, newChild);
  }
  return newChild;
};

/**
 * Removes a child node.
 * @param {!treesaver.ui.TreeNode} child
 * @return {treesaver.ui.TreeNode} The removed node or null if the node was not found.
 */
treesaver.ui.TreeNode.prototype.removeChild = function (child) {
  var index = this.children.indexOf(child),
      node = null;
  if (index !== -1) {
    node = this.children.splice(index, 1)[0];
    node.parent = null;
  }
  return node;
};
