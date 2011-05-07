goog.provide('treesaver.ui.TreeNode');

treesaver.ui.TreeNode = function () {
  this.children = [];
  this.parent = null;
};

treesaver.ui.TreeNode.prototype.appendChild = function (child) {
  child.parent = this;
  this.children.push(child);
  return child;
};

treesaver.ui.TreeNode.prototype.replaceChild = function (newChild, oldChild) {
  var index = this.children.indexOf(oldChild);
  if (index !== -1) {
    newChild.parent = oldChild.parent;
    oldChild.parent = null;
    return this.children.splice(index, 1, newChild)[0];
  }
  return null;
};

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

treesaver.ui.TreeNode.prototype.removeChild = function (child) {
  var index = this.children.indexOf(child),
      node = null;
  if (index !== -1) {
    node = this.children.splice(index, 1)[0];
    node.parent = null;
  }
  return node;
};
