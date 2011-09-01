/**
 * @fileoverview Extract resources defined in an external HTML file.
 */

goog.provide('treesaver.resources');

goog.require('treesaver.array');
goog.require('treesaver.constants');
goog.require('treesaver.debug');
goog.require('treesaver.dom');
goog.require('treesaver.network');

goog.scope(function() {
  var resources = treesaver.resources,
      array = treesaver.array,
      debug = treesaver.debug,
      dom = treesaver.dom,
      network = treesaver.network;
  /**
   * Loads resource file for the current document, as specified through
   * <link rel="resources" /> in the <head>
   *
   * @param {!function()} callback
   */
  resources.load = function(callback) {
    var url = resources.getResourcesLinkUrl_();

    if (!url) {
      debug.error('No link to resources found');

      // Technically, we're done loading
      callback();

      return;
    }

    // Are we in the loading process?
    if (resources.loadStatus_) {
      if (resources.loadStatus_ ===
          resources.LoadStatus.LOADED) {
        // Already loaded, callback immediately
        callback();
      }
      else {
        // Not loaded yet, add callback to list
        resources.callbacks_.push(callback);
      }

      return;
    }

    debug.info('Loading resources from: ' + url);

    // Set loading flag
    resources.loadStatus_ = resources.LoadStatus.LOADING;
    // Create callback array
    resources.callbacks_ = [callback];

    network.get(url, resources.processResourceFile);
  };

  /**
   * @type {RegExp}
   */
  resources.bodyRegExp = /<body>\s*([\s\S]+?)\s*<\/body>/i;

  /**
   * Find and return any text within a <title>
   * @param {?string} html
   * @return {?string}
   */
  resources.extractBody = function(html) {
    var res = resources.bodyRegExp.exec(html);
    if (res && res[1]) {
      return res[1];
    }
    return null;
  };

  /**
   *
   * @param {string} html
   */
  resources.processResourceFile = function(html) {
    // Create the main container
    resources.container_ = document.createElement('div');

    if (html) {
      var body = resources.extractBody(html);
      if (body) {
        var div = document.createElement('div');
        // Prevent any layout
        div.style.display = 'none';

        // Parse the HTML
        div.innerHTML = body;

        // Grab all the direct <div> children and place them into the container
        array.toArray(div.childNodes).forEach(function(child) {
          if (/^div$/i.test(child.nodeName)) {
            resources.container_.appendChild(child);
          }
        });

        dom.clearChildren(div);
      }
      else {
        debug.error('Body not found in resource file');
      }
    }
    else {
      debug.error('Could not load resource file');
    }

    resources.loadComplete_();
  };

  /**
   * Called when the resource file has finished processing
   */
  resources.loadComplete_ = function() {
    resources.loadStatus_ = resources.LoadStatus.LOADED;

    // Clone callback array
    var callbacks = resources.callbacks_.slice(0);

    // Clear out old callbacks
    resources.callbacks_ = [];

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
  resources.findByClassName = function(className) {
    // TODO: Restrict only to top-level children?
    return resources.container_ ? dom.querySelectorAll('.' + className, resources.container_) : [];
  };

  /**
   * Clear all data structures
   */
  resources.unload = function() {
    resources.container_ = null;
    resources.loadStatus_ = resources.LoadStatus.NOT_LOADED;
    resources.callbacks_ = [];
  };

  /**
   * Find the resource URL specified in the <head> in the first <link>
   * element with rel=resources
   *
   * @private
   * @return {?string} The url, if one was found.
   */
  resources.getResourcesLinkUrl_ = function() {
    var links = document.querySelectorAll('link[rel~=resources]');

    if (links.length) {
      return links[0].getAttribute('href');
    }

    return null;
  };

  /**
   * Load status enum
   * @enum {number}
   */
  resources.LoadStatus = {
    LOADED: 2,
    LOADING: 1,
    NOT_LOADED: 0
  };

  /**
   * Load status of resources
   *
   * @private
   * @type {resources.LoadStatus}
   */
  resources.loadStatus_;

  /**
   * Callbacks
   *
   * @private
   * @type {Array.<function()>}
   */
  resources.callbacks_;

  /**
   * DOM container for all resource elements
   *
   * @private
   * @type {Element}
   */
  resources.container_;
});
