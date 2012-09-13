/**
 * @fileoverview Google WebFont Loader adapter/implementation for treesaver.fonts.
 */

goog.provide('treesaver.fonts.googleadapter');

goog.require('treesaver.debug');

goog.scope(function() {
  var googleadapter = treesaver.fonts.googleadapter,
      debug = treesaver.debug;

  googleadapter.load = function(config, callback) {
    googleadapter.callback_ = callback;
    googleadapter.fontState_ = {};

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

  googleadapter.internal_ = {
    "active": function() {
      debug.info('googleadapter.active');
      googleadapter.callback_(googleadapter.fontState_);
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
      googleadapter.callback_(googleadapter.fontState_);
    },
    "loading": function() {
      debug.info('WebFont.loading');
    }
  };
});
