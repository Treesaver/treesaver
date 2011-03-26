/**
 * @fileoverview Async loading of JavaScript files.
 */

goog.provide('treesaver.scriptloader');

goog.require('treesaver.constants');
goog.require('treesaver.modules');

/**
 * @const {string}
 */
treesaver.scriptloader.BASE_FILENAME = treesaver.modules.get('treesaver-init');

/**
 * Load a script asynchronously
 *
 * @param {!string} name
 * @param {!function(string)} callback
 */
treesaver.scriptloader.load = function(name, callback) {
  var s = document.createElement('script');

  s.type = 'text/javascript';
  s.setAttribute('async', 'async');

  // Insert into tree
  document.documentElement.appendChild(s);
  // Setup callback
  s.onload = s.onreadystatechange = function(e) {
    if (!e) {
      e = window.event;
    }

    if (e.type === 'load' ||
        'readyState' in s &&
        (s.readyState === 'complete' || s.readyState === 'loaded')) {
      treesaver.debug.info('Asynchronous load complete: ' + name);

      // Clear handlers
      s.onload = s.onreadystatechange = null;

      // TODO: Use events instead?
      callback(name);
    }
    else {
      treesaver.debug.info('Extra script loading event recieved: ' + e.type);
    }
  };

  treesaver.debug.info('Begin asynchronous load: ' + name);

  // Start the script download
  s.src = treesaver.scriptloader.getUrlFromName_(name);
};

/**
 * Convert a script name into a full URL
 *
 * @private
 * @param {!string} name
 * @return {!string} Full url to the file.
 */
treesaver.scriptloader.getUrlFromName_ = function(name) {
  // Leave absolute paths alone, including ones that go to other servers
  // (check for '://' instead of http|https|file)
  if (SUPPORT_IE) {
    // IE7 flakes on name[0], have to use charAt instead
    if (name.charAt(0) === '/' || /:\/\//.test(name)) {
      return name;
    }
  }
  else {
    if (name[0] === '/' || /:\/\//.test(name)) {
      return name;
    }
  }

  // Assume relative to the base path
  return treesaver.scriptloader.getScriptPath_() + name;
};

/**
 * Cached storage for the base script path
 *
 * @private
 * @type {!string}
 */
treesaver.scriptloader.scriptPath_;

/**
 * Get the path for all script files
 *
 * @private
 * @return {!string}
 */
treesaver.scriptloader.getScriptPath_ = function() {
  // Calculate once
  if (!treesaver.scriptloader.scriptPath_) {
    var path = '',
        scripts = document.getElementsByTagName('script');

    // Search through scripts to find our base URL
    treesaver.array.toArray(scripts).forEach(function(script) {
      // TODO: Make this better
      if (!path && script.src.indexOf(treesaver.scriptloader.BASE_FILENAME) !== -1) {
        path = script.getAttribute('src');
      }
    });

    if (path) {
      treesaver.scriptloader.scriptPath_ =
        treesaver.scriptloader.getDirectoryName_(path);
    }
    else {
      treesaver.debug.error('Could not find script path');

      return '';
    }
  }

  return treesaver.scriptloader.scriptPath_;
};

/**
 * Get the directory name given a path
 *
 * @private
 * @param {!string} path
 * @return {!string} Directory name.
 */
treesaver.scriptloader.getDirectoryName_ = function(path) {
  var lastSlash = path.lastIndexOf('/');

  return path.substr(0, lastSlash + 1);
};
