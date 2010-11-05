/**
 * @fileoverview Capability testing and tracking library.
 *
 */

goog.provide('treesaver.capabilities');

goog.require('treesaver.array'); // array.some
goog.require('treesaver.constants');
goog.require('treesaver.debug');
goog.require('treesaver.dom');
// Avoid circular dependency
// goog.require('treesaver.network');

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
treesaver.capabilities.platform_ =
  // Android 1.6 doesn't have a value for navigator.platform
  !SUPPORT_LEGACY || window.navigator.platform ?
  window.navigator.platform.toLowerCase() :
  /android/.test(treesaver.capabilities.ua_) ? 'android' : 'unknown';

/**
 * Is this an older browser that requires some patching for key functionality
 * like querySelectorAll
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
  !!(document.documentElement.currentStyle || window.getComputedStyle) &&
  // Require querySelectorAll in order to exclude Firefox 3.0,
  // but allow IE7 by checking for their non-W3C event model
  ('querySelectorAll' in document ||
    // Opera 9.64 passes as SUPPORT_LEGACY, does not have querySelectorAll,
    // and has both attachEvent and addEventListener. We exclude it here
    // by narrowing down the scope to browsers that do not have querySelectorAll,
    // do have attachEvent but do not have addEventListener. Hopefully that only
    // matches IE7.
    (SUPPORT_IE && 'attachEvent' in document && !('addEventListener' in document)))
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
treesaver.capabilities.IS_MOBILE = WITHIN_IOS_WRAPPER ||
  /mobile/.test(treesaver.capabilities.ua_);

/**
 * Does the device have a small screen?
 *
 * @const
 * @type {boolean}
 */
treesaver.capabilities.IS_SMALL_SCREEN =
  window.screen.width <= 600;

/**
 * Name of the current browser. Possible values:
 *   - msie
 *   - chrome
 *   - safari
 *   - webkit
 *   - mozilla
 *   - opera
 *   - unknown
 *
 * @const
 * @type {string}
 */
treesaver.capabilities.BROWSER_NAME = (function() {
  if (WITHIN_IOS_WRAPPER) {
    return 'safari';
  }

  // TODO: This code is all terrible
  // Luckily it runs only once
  if (/webkit/.test(treesaver.capabilities.ua_)) {
    if (/chrome|safari/.test(treesaver.capabilities.ua_)) {
      return /(chrome|safari)/.exec(treesaver.capabilities.ua_)[0];
    }
    else {
      return 'webkit';
    }
  }
  else if (/opera/.test(treesaver.capabilities.ua_)) {
    return 'opera';
  }
  else if (/msie/.test(treesaver.capabilities.ua_)) {
    return 'msie';
  }
  else if (!/compatible/.test(treesaver.capabilities.ua_) &&
    /mozilla/.test(treesaver.capabilities.ua_)) {
    return 'mozilla';
  }
  else {
    return 'unknown';
  }
}());

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
treesaver.capabilities.SUPPORTS_TOUCH = WITHIN_IOS_WRAPPER ||
  'createTouch' in document ||
  // Android doesn't expose createTouch, must test userAgent manually
  /android/.test(treesaver.capabilities.ua_);

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
    treesaver.debug.warn('Using ActiveX detection for Flash');

    try {
      // Throws exception if not in registry
      return !!(new window.ActiveXObject('ShockwaveFlash.ShockwaveFlash.7'));
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
  if (SUPPORT_LEGACY && treesaver.capabilities.IS_LEGACY) {
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
 * Whether the browser has native support for the microdata API
 *
 * @const
 * @type {boolean}
 */
treesaver.capabilities.SUPPORTS_MICRODATA =
  'getItems' in document;

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
  'localStorage' in window &&
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
 * @type {Array.<string>}
 */
treesaver.capabilities.caps_;

/**
 * Transient browser capabilities, such as online/offline, that may change
 * after a page is loaded
 *
 * @private
 * @type {Array.<string>}
 */
treesaver.capabilities.transientCaps_;

/**
 * Return 'no-' if false
 *
 * @private
 * @param {!boolean} val
 * @return {!string} 'no-' if val is false, '' otherwise.
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
  // Ugh, closure style makes this really gross, store function
  // for some reprieve
  var p = treesaver.capabilities.doPrefix_;

  if (!treesaver.capabilities.caps_) {
    // First run through, populate the static capabilities that never change
    treesaver.capabilities.caps_ = [];
    treesaver.capabilities.caps_.push(
      // Use the same class names as modernizr when applicable
      'js',
      p(treesaver.capabilities.SUPPORTS_CANVAS) + 'canvas',
      p(treesaver.capabilities.SUPPORTS_LOCALSTORAGE) + 'localstorage',
      p(treesaver.capabilities.SUPPORTS_VIDEO) + 'video',
      p(treesaver.capabilities.SUPPORTS_APPLICATIONCACHE) + 'applicationcache',
      p(treesaver.capabilities.SUPPORTS_FONTFACE) + 'fontface',
      p(treesaver.capabilities.SUPPORTS_TOUCH) + 'touch',
      // Not in modernizr
      p(treesaver.capabilities.SUPPORTS_MICRODATA) + 'microdata',
      p(treesaver.capabilities.SUPPORTS_TREESAVER) + 'treesaver',
      p(treesaver.capabilities.SUPPORTS_FLASH) + 'flash',
      p(treesaver.capabilities.SUPPORTS_ORIENTATION) + 'orientation',
      p(treesaver.capabilities.IS_LEGACY) + 'legacy',
      p(treesaver.capabilities.IS_MOBILE) + 'mobile',
      p(treesaver.capabilities.IS_SMALL_SCREEN) + 'smallscreen',
      p(treesaver.network.loadedFromCache()) + 'cached',
      p(WITHIN_IOS_WRAPPER) + 'nativeapp',
      // Browser/platform info
      'browser-' + treesaver.capabilities.BROWSER_NAME,
      'os-' + treesaver.capabilities.BROWSER_OS
    );
  }

  // Always update transient info
  treesaver.capabilities.transientCaps_ = [
    // Online/offline
    p(!treesaver.network.isOnline()) + 'offline'
  ];

  if (treesaver.capabilities.SUPPORTS_ORIENTATION) {
    // Orientation
    treesaver.capabilities.transientCaps_.push(
      'orientation-' + (window['orientation'] ? 'horizontal' : 'vertical')
    );
  }
};

/**
 * Have the stable capability flags been added to the <html> element?
 *
 * @private
 * @type {boolean}
 */
treesaver.capabilities.capsFlagged_ = false;

/**
 * Update the classes on the <html> element based on current capabilities
 */
treesaver.capabilities.updateClasses = function() {
  // Refresh stored capabilities
  treesaver.capabilities.update_();

  var className = document.documentElement.className;

  if (!treesaver.capabilities.capsFlagged_) {
    treesaver.capabilities.capsFlagged_ = true;

    if (className) {
      // First time through, remove no-js and no-treesaver flags, if present
      className = className.replace(/no-js|no-treesaver/g, '');
    }
    else {
      // Class was blank, give an initial value
      className = '';
    }

    // Add the non-transient capabilities on the body
    className += ' ' + treesaver.capabilities.caps_.join(' ');

    treesaver.debug.info('Capability classes: ' + className);
  }

  // Now, remove values of transient capabilities
  // TODO: As we get more of these, need a simpler way to filter out the old values
  className = className.replace(treesaver.capabilities.transientCapabilityRegex_, '');

  className += ' ' + treesaver.capabilities.transientCaps_.join(' ');

  // Now set the classes (and normalize whitespace)
  document.documentElement.className = className.split(/\s+/).join(' ');
};

/**
 * Reset the classes on the documentElement to a non-treesaver
 */
treesaver.capabilities.resetClasses = function() {
  document.documentElement.className = 'js no-treesaver';
};

/**
 * Array with all the transient capability names
 *
 * @private
 * @type {!Array.<string>}
 */
treesaver.capabilities.transientCapabilityList_ = [
  'offline',
  'orientation-vertical',
  'orientation-horizontal'
];

/**
 * Regex for removing transient capabilities from a string
 *
 * @private
 * @type {!RegExp}
 */
treesaver.capabilities.transientCapabilityRegex_ = (function() {
  var terms = treesaver.capabilities.transientCapabilityList_.map(function(term) {
    return '((no-)?' + term + ')';
  });

  return new RegExp(terms.join('|'));
}());

/**
 * Check if a set of requirements are met by the current browser state
 *
 * @param {!Array.<string>} required Required capabilities.
 * @param {boolean=} useTransient Whether transient capabilities should be
 *                                checked as well.
 * @return {boolean} True if requirements are met.
 */
treesaver.capabilities.check = function checkCapabilities(required, useTransient) {
  if (!required.length) {
    return true;
  }

  // Requirements are in the form of 'flash', 'offline', or 'no-orientation'
  return required.every(function(req) {
    var isNegation = req.substr(0, 3) === 'no-',
        rootReq = isNegation ? req.substr(3) : req,
        allCaps = treesaver.capabilities.caps_.concat(
          useTransient ? treesaver.capabilities.transientCaps_ : []
        );

    if (isNegation) {
      // If it's negation, make sure the capability isn't in the capability list
      return allCaps.indexOf(rootReq) === -1;
    }
    else {
      if (allCaps.indexOf(rootReq) !== -1) {
        // Have the capability, all good
        return true;
      }

      // Requirement may be a transient property, need to check
      if (!useTransient &&
          treesaver.capabilities.transientCapabilityList_.indexOf(rootReq) !== -1) {
          // Requirement isn't met, but is transient, let it pass for now
          return true;
      }

      return false;
    }
  });
};
