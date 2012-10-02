/**
 * @fileoverview Google WebFont Loader adapter/implementation for treesaver.fonts.
 */

goog.provide('treesaver.fonts.googleadapter');

goog.require('treesaver.debug');

goog.scope(function() {
  var googleadapter = treesaver.fonts.googleadapter,
      debug = treesaver.debug;

  /**
   * @private
   * @const
   * @type {number}
   */
   googleadapter.DEFAULT_TIMEOUT = 4000;

  googleadapter.load = function(config, callback) {
    googleadapter.callback_ = callback;
    googleadapter.fontState_ = {};
    googleadapter.done_ = false;

    googleadapter.timeout_ = setTimeout(googleadapter.abort_, googleadapter.DEFAULT_TIMEOUT);

    (function() {
      var wf = document.createElement('script');
      wf.src = '//ajax.googleapis.com/ajax/libs/webfont/1/webfont.js';
      wf.type = 'text/javascript';
      wf.async = 'true';
      wf.onload = function() {
        var WebFont = window['WebFont'];
        WebFont.load(googleadapter.createConfig_(config));
      };
      var s = document.getElementsByTagName('script')[0];
      s.parentNode.insertBefore(wf, s);
    })();
  };

  googleadapter.createConfig_ = function(config) {
    var newConfig = Object.clone(googleadapter.internal_);
    var i;

    for (i = 0; i < googleadapter.validOptions.length; i++) {
      if (config.hasOwnProperty(googleadapter.validOptions[i])) {
        newConfig[googleadapter.validOptions[i]] = config[googleadapter.validOptions[i]];
      }
    }
    return newConfig;
  };

  googleadapter.validOptions = [
    'ascender',
    'custom',
    'google',
    'monotype',
    'typekit'
  ];

  googleadapter.complete_ = function(payload) {
    clearTimeout(googleadapter.timeout_);
    if (!googleadapter.done_) {
      googleadapter.done_ = true;
      googleadapter.callback_(payload);
    }
  };

  googleadapter.abort_ = function() {
    debug.info('googleadapter.abort');
    googleadapter.complete_(googleadapter.fontState_);
  };

  googleadapter.internal_ = {
    "active": function() {
      debug.info('googleadapter.active');
      googleadapter.complete_(googleadapter.fontState_);
    },
    "fontactive": function(family) {
      debug.info('WebFont.fontactive ' + family);
      googleadapter.fontState_[family] = 'active';
    },
    "fontinactive": function(family) {
      debug.info('WebFont.fontinactive ' + family);
      googleadapter.fontState_[family] = 'inactive';
    },
    "fontloading": function(family) {
      debug.info('WebFont.fontloading ' + family);
      googleadapter.fontState_[family] = 'loading';
    },
    "inactive": function() {
      debug.info('WebFont.inactive');
      googleadapter.complete_(googleadapter.fontState_);
    },
    "loading": function() {
      debug.info('WebFont.loading');
    }
  };
});
