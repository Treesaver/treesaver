/**
 * @fileoverview Capability testing and tracking library
 *
 */

goog.provide('treesaver.capabilities');

goog.require('treesaver.array'); // array.some
goog.require('treesaver.debug');
goog.require('treesaver.dom');

/**
 * Cached value of browser user agent
 *
 * @const
 * @private
 * @type {string}
 */
treesaver.capabilities.ua_ = window.navigator.userAgent.toLowerCase();

/**
 * Cached value of browser platform
 *
 * @const
 * @private
 * @type {string}
 */
treesaver.capabilities.platform_ = window.navigator.platform.toLowerCase();

/**
 * Does the current browser meet the Treesaver requirements
 *
 * @const
 * @type {boolean}
 */
treesaver.capabilities.SUPPORTS_TREESAVER = !SUPPORT_LEGACY || (
  // Can't be in quirks mode (box model issues)
  document.compatMode !== 'BackCompat' &&
  // Need W3C AJAX (excludes IE6)
  'XMLHttpRequest' in window &&
  // W3C or IE Event model (should be everywhere)
  !!(document.addEventListener || document.attachEvent) &&
  // Runtime styles (needed for measuring, should be everywhere)
  !!(document.documentElement.currentStyle || window.getComputedStyle)
);

/**
 * Does the current browser require extra libraries in order to meet
 * treesaver requirements (such as support for querySelectorAll)
 *
 * @const
 * @type {boolean}
 */
treesaver.capabilities.IS_LEGACY = SUPPORT_LEGACY && !(
  // Storage
  'localStorage' in window &&
  'querySelectorAll' in document &&
  'JSON' in window
);

/**
 * Is this browser IE8 running in IE7 compat mode?
 *
 * @const
 * @type {boolean}
 */
treesaver.capabilities.IS_IE8INIE7 = SUPPORT_IE &&
  'documentMode' in document && document.documentMode <= 7;

/**
 * Is the browser running on a mobile device?
 *
 * @const
 * @type {boolean}
 */
treesaver.capabilities.IS_MOBILE =
  treesaver.capabilities.ua_.indexOf('mobile') !== -1;

/**
 * Name of the current browser. Possible values:
 *   - msie
 *   - mozilla
 *   - chrome
 *   - safari
 *   - webkit
 *   - opera
 *   - unknown
 *
 * @const
 * @type {string}
 */
treesaver.capabilities.BROWSER_NAME =
  /(chrome|safari|webkit|opera|msie|mozilla)/.
  exec(treesaver.capabilities.ua_)[0] || 'unknown';

/**
 * Which OS is the browser running on, possible values:
 *   - win
 *   - mac
 *   - linux
 *   - iphone
 *   - ipad
 *   - android
 *   - unknown
 *
 * @const
 * @type {string}
 */
treesaver.capabilities.BROWSER_OS =
  (/(android|ipad|iphone|win|mac|linux)/.
  exec(treesaver.capabilities.platform_))[0] || 'unknown';

/**
 * Whether the browser exposes orientation information
 *
 * @const
 * @type {boolean}
 */
treesaver.capabilities.SUPPORTS_ORIENTATION = 'orientation' in window;

/**
 * Whether the browser supports touch events
 *
 * @const
 * @type {boolean}
 */
treesaver.capabilities.SUPPORTS_TOUCH = 'createTouch' in document ||
  // Android doesn't expose createTouch, must test userAgent manually
  treesaver.capabilities.ua_.indexOf('android') !== -1;

/**
 * Does the browser have flash support?
 *
 * @const
 * @type {boolean}
 */
treesaver.capabilities.SUPPORTS_FLASH = (function() {
  if (!!window.navigator.plugins && window.navigator.plugins.length) {
    // Non-IE browsers are pretty simple
    return !!window.navigator.plugins['Shockwave Flash'];
  }
  else if (SUPPORT_IE && 'ActiveXObject' in window) {
    treesaver.debug.warn("Using ActiveX detection for Flash");

    try {
      // Throws exception if not in registry
      return !!(new window.ActiveXObject("ShockwaveFlash.ShockwaveFlash.7"));
    }
    catch (e) {
      treesaver.debug.warn('ActiveX Flash detection failed with exception:' + e);

      // Instantiation failed
      return false;
    }
  }

  return false;
}());

/**
 * Does the browser support custom fonts via @font-face
 *
 * Note that this detection is fast, but imperfect. Gives a false positive
 * for a few fringe browsers.
 *
 * @const
 * @type {boolean}
 */
treesaver.capabilities.SUPPORTS_FONTFACE = (function() {
  if (treesaver.capabilities.IS_LEGACY) {
    // Only legacy browser with @font-face support is IE7,
    // which we don't care enough about
    return false;
  }

  // Quick and easy test that works in FF2+, Safari, and Opera
  // Note: This gives a false positive for older versions of Chrome,
  // (version 3 and earlier). Market share is too low to care
  if ('CSSFontFaceRule' in window) {
    return true;
  }

  // IE fails in previous support even though it's suported EOT for a
  // long long time
  if (SUPPORT_IE && treesaver.capabilities.BROWSER_NAME === 'msie') {
    return true;
  }

  // No @font-face support
  return false;
}());

/**
 * Whether the browser supports <canvas>
 *
 * @const
 * @type {boolean}
 */
treesaver.capabilities.SUPPORTS_CANVAS =
  'getContext' in document.createElement('canvas');

/**
 * Whether the browser can play <video>
 *
 * @const
 * @type {boolean}
 */
treesaver.capabilities.SUPPORTS_VIDEO =
  'canPlayType' in document.createElement('video');

/**
 * Whether the browser supports localStorage
 *
 * @const
 * @type {boolean}
 */
treesaver.capabilities.SUPPORTS_LOCALSTORAGE =
  // FF3 supports localStorage, but doesn't have native JSON
  !treesaver.capabilities.IS_LEGACY;

/**
 * Whether the browser supports offline web applications
 *
 * @const
 * @type {boolean}
 */
treesaver.capabilities.SUPPORTS_APPLICATIONCACHE = 'applicationCache' in window;

/**
 * Current browser capabilities
 *
 * @private
 * @type {Array.<boolean>}
 */
treesaver.capabilities.caps_;

/**
 * Return 'no-' if false
 *
 * @private
 * @param {!boolean} val
 * @return {!string} 'no-' if val is false, '' otherwise
 */
treesaver.capabilities.doPrefix_ = function(val) {
  return val ? '' : 'no-';
};

/**
 * Test the browser's capabilities and populate the cached caps_ array
 *
 * @private
 */
treesaver.capabilities.update_ = function() {
  if (!treesaver.capabilities.caps_) {
    // Ugh, closure style makes this really gross, store function
    // for some reprieve
    var p = treesaver.capabilities.doPrefix_;

    // First run through, populate the static capabilities that never change
    treesaver.capabilities.caps_ = [];
    treesaver.capabilities.caps_.push(
      // Use the same class names as modernizr when applicable
      p(treesaver.capabilities.SUPPORTS_CANVAS) + 'canvas',
      p(treesaver.capabilities.SUPPORTS_LOCALSTORAGE) + 'localstorage',
      p(treesaver.capabilities.SUPPORTS_VIDEO) + 'video',
      p(treesaver.capabilities.SUPPORTS_APPLICATIONCACHE) + 'applicationcache',
      p(treesaver.capabilities.SUPPORTS_FONTFACE) + 'fontface',
      // Not in modernizr
      p(treesaver.capabilities.SUPPORTS_TREESAVER) + 'treesaver',
      p(treesaver.capabilities.SUPPORTS_FLASH) + 'flash',
      p(treesaver.capabilities.SUPPORTS_ORIENTATION) + 'orientation',
      p(treesaver.capabilities.IS_LEGACY) + 'legacy',
      p(treesaver.capabilities.IS_MOBILE) + 'mobile',
      // Browser/platform info
      'browser-' + treesaver.capabilities.BROWSER_NAME,
      'os-' + treesaver.capabilities.BROWSER_OS
    );
  }

  // TODO: Update transient info
  // online/offline
  // orienatation
};

/**
 * Update the classes on the <html> element based on current capabilities
 */
treesaver.capabilities.updateClasses = function() {
  if (!treesaver.capabilities.update_()) {
    // TODO: Remove stale classes
    treesaver.capabilities.update_();
    treesaver.dom.addClass(document.documentElement, treesaver.capabilities.caps_.join(' '));
  }
};

/**
 * Check if a set of requirements are met by the current browser state
 *
 * @param {!Array.<string>} required Required capabilities
 * @return {boolean} True if requirements are met
 */
treesaver.capabilities.check = function checkCapabilities(required) {
  if (!required.length) {
    return true;
  }

  return !required.some(function (req) {
    return treesaver.capabilities.caps_.indexOf(req) === -1;
  });
};
