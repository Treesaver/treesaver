/**
 * @fileoverview Extract fonts defined in an external HTML file.
 */

goog.provide('treesaver.fonts');

goog.require('treesaver.fonts.googleadapter');
goog.require('treesaver.debug');
goog.require('treesaver.dom');
goog.require('treesaver.events');

goog.scope(function() {
  var fonts = treesaver.fonts,
      debug = treesaver.debug,
      dom = treesaver.dom,
      events = treesaver.events,
      googleadapter = treesaver.fonts.googleadapter;

  /**
   * Loads custom fonts for the current document
   *
   * @param {!function()} callback
   */
   fonts.load = function(callback) {
    if (!window['treesaverFonts']) {
      debug.info("No treesaverFonts specified; nothing to do here.");
      callback();
      return;
    }

    if (fonts.loadStatus_) {
      if (fonts.loadStatus_ ===
          fonts.LoadStatus.LOADED) {
        // Already loaded, callback immediately
        callback();
      }
      else {
        // Not loaded yet, add callback to list
        fonts.callbacks_.push(callback);
      }

      return;
    }

    fonts.loadStatus_ = fonts.LoadStatus.LOADING;
    // Not loaded yet, add callback to list
    fonts.callbacks_ = [callback];
    // do the stuff
    events.addListener(document, treesaver.customevents.LOADERSHOWN, fonts.load_);
  };

  fonts.load_ = function() {
    googleadapter.load(window['treesaverFonts'], function(result) {
      var classes = [], className, family;
      for (family in result) {
        if (result.hasOwnProperty(family)) {
          className = 'ts-' + fonts.slugify(family) + (result[family] == 'active' ? '-active' : '-inactive');
          classes.push(className);
        }
      }
      dom.addClass(document.documentElement, classes.join(' '));
      fonts.loadComplete_();
    });
  };

  fonts.slugify = function(name) {
    return name.toLowerCase().replace(/[^a-z]+/g, '-');
  };

  /**
   * Called when custom fonts loading is finished
   */
  fonts.loadComplete_ = function() {
    fonts.loadStatus_ = fonts.LoadStatus.LOADED;

    // Clone callback array
    var callbacks = fonts.callbacks_.slice(0);

    // Clear out old callbacks
    fonts.callbacks_ = [];

    // Do callbacks
    callbacks.forEach(function(callback) {
      callback();
    });
  };

  fonts.unload = function() {
    debug.info('fonts.unload');
    fonts.loadStatus_ = fonts.LoadStatus.NOT_LOADED;
    fonts.callbacks_ = [];
  };

  /**
   * Load status enum
   * @enum {number}
   */
  fonts.LoadStatus = {
    LOADED: 2,
    LOADING: 1,
    NOT_LOADED: 0
  };

  /**
   * Load status of fonts
   *
   * @private
   * @type {fonts.LoadStatus}
   */
  fonts.loadStatus_;

  /**
   * Callbacks
   *
   * @private
   * @type {Array.<function()>}
   */
  fonts.callbacks_;
});
