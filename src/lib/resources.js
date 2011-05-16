/**
 * @fileoverview Extract resources defined in an external HTML file.
 */

goog.provide('treesaver.resources');

goog.require('treesaver.constants');
goog.require('treesaver.debug');
goog.require('treesaver.dom');
goog.require('treesaver.network');

/**
 * Loads resource file for the current document, as specified through
 * <link rel="resources" /> in the <head>
 *
 * @param {!function()} callback
 */
treesaver.resources.load = function(callback) {
  var url = treesaver.resources.getResourcesLinkUrl_();

  if (!url) {
    treesaver.debug.error('No link to resources found');

    // Technically, we're done loading
    callback();

    return;
  }

  // Are we in the loading process?
  if (treesaver.resources.loadStatus_) {
    if (treesaver.resources.loadStatus_ ===
        treesaver.resources.LoadStatus.LOADED) {
      // Already loaded, callback immediately
      callback();
    }
    else {
      // Not loaded yet, add callback to list
      treesaver.resources.callbacks_.push(callback);
    }

    return;
  }

  treesaver.debug.info('Loading resources from: ' + url);

  // Set loading flag
  treesaver.resources.loadStatus_ = treesaver.resources.LoadStatus.LOADING;
  // Create callback array
  treesaver.resources.callbacks_ = [callback];

  treesaver.network.get(url, treesaver.resources.processResourceFile);
};

/**
 * @type {RegExp}
 */
treesaver.resources.bodyRegExp = /<body>\s*([\s\S]+?)\s*<\/body>/i;

/**
 * Find and return any text within a <title>
 * @param {?string} html
 * @return {?string}
 */
treesaver.resources.extractBody = function(html) {
  var res = treesaver.resources.bodyRegExp.exec(html);
  if (res && res[1]) {
    return res[1];
  }
  return null;
};

/**
 *
 * @param {string} html
 */
treesaver.resources.processResourceFile = function(html) {
  // Create the main container
  treesaver.resources.container_ = document.createElement('div');

  if (html) {
    var body = treesaver.resources.extractBody(html);
    if (body) {
      var div = document.createElement('div');
      // Prevent any layout
      div.style.display = 'none';

      // Must attach element into the tree to avoid parsing issues from
      // HTML5 shiv in IE using innerHTML
      if (SUPPORT_IE) {
        document.documentElement.appendChild(div);
      }

      // Parse the HTML
      div.innerHTML = body;

      // Grab all the direct <div> children and place them into the container
      treesaver.array.toArray(div.childNodes).forEach(function(child) {
        if (child.nodeType === 1 && child.nodeName.toLowerCase() === 'div') {
          treesaver.resources.container_.appendChild(child);
        }
      });

      // Clean up
      if (SUPPORT_IE) {
        document.documentElement.removeChild(div);
      }
      div.innerHTML = '';
    } else {
      treesaver.debug.error('Body not found in resource file');
    } 
  }
  else {
    treesaver.debug.error('Could not load resource file');
  }

  treesaver.resources.loadComplete_();
};

/**
 * Called when the resource file has finished processing
 */
treesaver.resources.loadComplete_ = function() {
  treesaver.resources.loadStatus_ = treesaver.resources.LoadStatus.LOADED;

  // Clone callback array
  var callbacks = treesaver.resources.callbacks_.slice(0);

  // Clear out old callbacks
  treesaver.resources.callbacks_ = [];

  // Do callbacks
  callbacks.forEach(function(callback) {
    callback();
  });
};

/**
 * Return resources based on class name
 *
 * @param {!string} className
 * @return {!Array.<Element>} Array of matching resource elements.
 */
treesaver.resources.findByClassName = function(className) {
  // TODO: Restrict only to top-level children?
  return treesaver.resources.container_ ? treesaver.dom.
    getElementsByClassName(className, treesaver.resources.container_) :
    [];
};

/**
 * Clear all data structures
 */
treesaver.resources.unload = function() {
  treesaver.resources.container_ = null;
  treesaver.resources.loadStatus_ = treesaver.resources.LoadStatus.NOT_LOADED;
  treesaver.resources.callbacks_ = [];
};

/**
 * Find the resource URL specified in the <head> in the first <link>
 * element with rel=resources
 *
 * @private
 * @return {?string} The url, if one was found.
 */
treesaver.resources.getResourcesLinkUrl_ = function() {
  var links = document.getElementsByTagName('link'),
      i, len = links.length;

  for (i = 0; i < len; i += 1) {
    if (links[i].rel.toLowerCase().indexOf('resources') !== -1) {
      return links[i].getAttribute('href');
    }
  }

  return null;
};

/**
 * Load status enum
 * @enum {number}
 */
treesaver.resources.LoadStatus = {
  LOADED: 2,
  LOADING: 1,
  NOT_LOADED: 0
};

/**
 * Load status of resources
 *
 * @private
 * @type {treesaver.resources.LoadStatus}
 */
treesaver.resources.loadStatus_;

/**
 * Callbacks
 *
 * @private
 * @type {Array.<function()>}
 */
treesaver.resources.callbacks_;

/**
 * DOM container for all resource elements
 *
 * @private
 * @type {Element}
 */
treesaver.resources.container_;
