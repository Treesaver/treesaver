/**
 * @fileoverview Capability testing and tracking library.
 *
 */

goog.provide('treesaver.capabilities');

goog.require('treesaver.array'); // array.some
goog.require('treesaver.constants');
goog.require('treesaver.debug');
// Avoid circular dependency
// goog.require('treesaver.network');
// goog.require('treesaver.dimensions');

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
  treesaver.capabilities.BROWSER_OS === 'android' ||
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
 *   - ipod
 *   - android
 *   - unknown
 *
 * @const
 * @type {string}
 */
treesaver.capabilities.BROWSER_OS =
  (/(android|ipad|iphone|ipod|win|mac|linux)/.
  exec(treesaver.capabilities.platform_) || ['unknown'])[0];

/**
 * Browser engine prefix for non-standard CSS properties
 *
 * @const
 * @type {string}
 */
treesaver.capabilities.cssPrefix = (function() {
  switch (treesaver.capabilities.BROWSER_NAME) {
  case 'chrome':
  case 'safari':
  case 'webkit':
    return '-webkit-';
  case 'mozilla':
    return '-moz-'
  case 'msie':
    return '-ms-';
  case 'opera':
    return '-o-';
  default:
    return '';
  }
}());

/**
 * Browser engine prefix for non-standard CSS properties
 *
 * @const
 * @type {string}
 */
treesaver.capabilities.domCSSPrefix = (function() {
  switch (treesaver.capabilities.BROWSER_NAME) {
  case 'chrome':
  case 'safari':
  case 'webkit':
    return 'Webkit';
  case 'mozilla':
    return 'Moz'
  case 'msie':
    return 'ms';
  case 'opera':
    return 'O';
  default:
    return '';
  }
}());

/**
 * Helper function for testing CSS properties
 *
 * @private
 * @param {!string} propName
 * @param {boolean=} testPrefix
 * @param {boolean=} skipPrimary
 * @return {boolean}
 */
treesaver.capabilities.cssPropertySupported_ = function(propName, testPrefix, skipPrimary) {
  var styleObj = document.documentElement.style,
      prefixed = testPrefix && treesaver.capabilities.domCSSPrefix ?
        (treesaver.capabilities.domCSSPrefix + propName.charAt(0).toUpperCase() + propName.substr(1)) :
        false;

  return (!skipPrimary && typeof styleObj[propName] !== 'undefined') ||
         (!!prefixed && typeof styleObj[prefixed] !== 'undefined');
};

/**
 * Helper function for testing support of a CSS @media query
 * Hat tip to Modernizr for this code
 *
 * @private
 * @param {!string} queryName
 * @param {boolean=} testPrefix
 * @return {boolean}
 */
treesaver.capabilities.mediaQuerySupported_ = function(queryName, testPrefix) {
  var st = document.createElement('style'),
      div = document.createElement('div'),
      div_id = 'ts-test',
      mq = '@media (' + queryName + ')',
      result;

  if (testPrefix) {
    mq += ',(' + treesaver.capabilities.cssPrefix + queryName + ')';
  }

  st.textContent = mq + '{#' + div_id + ' {height:3px}}';
  div.setAttribute('id', div_id);
  document.documentElement.appendChild(st);
  document.documentElement.appendChild(div);

  // Confirm the style was applied
  result = div.offsetHeight === 3;

  document.documentElement.removeChild(st);
  document.documentElement.removeChild(div);

  return result;
};

/**
 * Whether the browser exposes orientation information
 *
 * @const
 * @type {boolean}
 */
treesaver.capabilities.SUPPORTS_ORIENTATION = WITHIN_IOS_WRAPPER ||
  'orientation' in window;

/**
 * Whether the browser supports touch events
 *
 * @const
 * @type {boolean}
 */
treesaver.capabilities.SUPPORTS_TOUCH = WITHIN_IOS_WRAPPER ||
  'createTouch' in document ||
  // Android doesn't expose createTouch, use quick hack
  /android/.test(treesaver.capabilities.ua_);

/**
 * Does the browser have flash support?
 *
 * @const
 * @type {boolean}
 */
treesaver.capabilities.SUPPORTS_FLASH = !WITHIN_IOS_WRAPPER && (function() {
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
 * SVG detection based on Modernizr (http://www.modernizr.com)
 * Copyright (c) 2009-2011, Faruk Ates and Paul Irish
 * Dual-licensed under the BSD or MIT licenses.
 */
if ('createElementNS' in document) {
  /**
   * Whether the browser supports SVG
   *
   * @const
   * @type {boolean}
   */
  treesaver.capabilities.SUPPORTS_SVG = 'createSVGRect' in document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  /**
   * Whether the browser supports SMIL
   *
   * @const
   * @type {boolean}
   */
  treesaver.capabilities.SUPPORTS_SMIL = /SVG/.test(document.createElementNS('http://www.w3.org/2000/svg', 'animate').toString());

  /**
   * Whether the browser supports SVG clip paths
   *
   * @const
   * @type {boolean}
   */
  treesaver.capabilities.SUPPORTS_SVGCLIPPATHS = /SVG/.test(document.createElementNS('http://www.w3.org/2000/svg', 'clipPath').toString());
} else {
  // Don't bother with SVG in IE7/8
  treesaver.capabilities.SUPPORTS_SVG = treesaver.capabilities.SUPPORTS_SMIL = treesaver.capabilities.SUPPORTS_SVGCLIPPATHS = false;
}

treesaver.capabilities.SUPPORTS_INLINESVG = (function() {
  var div = document.createElement('div');
  div.innerHTML = '<svg/>';
  return (div.firstChild && div.firstChild.namespaceURI) == 'http://www.w3.org/2000/svg';
}());

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
treesaver.capabilities.SUPPORTS_APPLICATIONCACHE =
  !WITHIN_IOS_WRAPPER && 'applicationCache' in window;

/**
 * Whether the browser supports CSS transforms
 *
 * @const
 * @type {boolean}
 */
treesaver.capabilities.SUPPORTS_CSSTRANSFORMS = WITHIN_IOS_WRAPPER ||
  treesaver.capabilities.cssPropertySupported_('transformProperty') ||
  // Browsers used WebkitTransform instead of WebkitTransformProperty
  treesaver.capabilities.cssPropertySupported_('transform', true, true);

/**
 * Whether the browser supports CSS 3d transforms
 *
 * @const
 * @type {boolean}
 */
treesaver.capabilities.SUPPORTS_CSSTRANSFORMS3D = WITHIN_IOS_WRAPPER ||
  (function() {
    var result = treesaver.capabilities.cssPropertySupported_('perspectiveProperty') ||
      treesaver.capabilities.cssPropertySupported_('perspective', true, true);

    // Chrome gives false positives for webkitPerspective
    // Hat tip to modernizr
    if (result && 'WebkitPerspective' in document.documentElement.style &&
      treesaver.capabilities.BROWSER_NAME !== 'safari') {
      // Confirm support via media query test
      result = treesaver.capabilities.mediaQuerySupported_('perspective', true);
    }

    return result;
  }());

/**
 * Whether the browser supports CSS transitions
 *
 * @const
 * @type {boolean}
 */
treesaver.capabilities.SUPPORTS_CSSTRANSITIONS = WITHIN_IOS_WRAPPER ||
  treesaver.capabilities.cssPropertySupported_('transitionProperty', true);

/**
 * Current browser capabilities
 *
 * @private
 * @type {Array.<string>}
 */
treesaver.capabilities.caps_;

/**
 * Mutable browser capabilities, such as online/offline, that may change
 * after a page is loaded
 *
 * @private
 * @type {Array.<string>}
 */
treesaver.capabilities.mutableCaps_;

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
      p(treesaver.capabilities.SUPPORTS_CSSTRANSFORMS) + 'csstransforms',
      p(treesaver.capabilities.SUPPORTS_CSSTRANSFORMS3D) + 'csstransforms3d',
      p(treesaver.capabilities.SUPPORTS_CSSTRANSITIONS) + 'csstransitions',
      p(treesaver.capabilities.SUPPORTS_SVG) + 'svg',
      p(treesaver.capabilities.SUPPORTS_INLINESVG) + 'inlinesvg',
      p(treesaver.capabilities.SUPPORTS_SMIL) + 'smil',
      p(treesaver.capabilities.SUPPORTS_SVGCLIPPATHS) + 'svgclippaths',
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

  // Always update mutable info
  treesaver.capabilities.mutableCaps_ = [
    // Online/offline
    p(!treesaver.network.isOnline()) + 'offline'
  ];

  if (treesaver.capabilities.SUPPORTS_ORIENTATION) {
    // Orientation
    treesaver.capabilities.mutableCaps_.push(
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

    // Add the non-mutable capabilities on the body
    className += ' ' + treesaver.capabilities.caps_.join(' ');

    treesaver.debug.info('Capability classes: ' + className);
  }

  // Now, remove values of mutable capabilities
  // TODO: As we get more of these, need a simpler way to filter out the old values
  className = className.replace(treesaver.capabilities.mutableCapabilityRegex_, '');

  className += ' ' + treesaver.capabilities.mutableCaps_.join(' ');

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
 * Array with all the mutable capability names
 *
 * @private
 * @type {!Array.<string>}
 */
treesaver.capabilities.mutableCapabilityList_ = [
  'offline',
  'orientation-vertical',
  'orientation-horizontal'
];

/**
 * Regex for removing mutable capabilities from a string
 *
 * @private
 * @type {!RegExp}
 */
treesaver.capabilities.mutableCapabilityRegex_ = (function() {
  var terms = treesaver.capabilities.mutableCapabilityList_.map(function(term) {
    return '((no-)?' + term + ')';
  });

  return new RegExp(terms.join('|'));
}());

/**
 * Check if a set of requirements are met by the current browser state
 *
 * @param {!Array.<string>} required Required capabilities.
 * @param {boolean=} useMutable Whether mutable capabilities should be
 *                                checked as well.
 * @return {boolean} True if requirements are met.
 */
treesaver.capabilities.check = function checkCapabilities(required, useMutable) {
  if (!required.length) {
    return true;
  }

  // Requirements are in the form of 'flash', 'offline', or 'no-orientation'
  return required.every(function(req) {
    var isNegation = req.substr(0, 3) === 'no-',
        rootReq = isNegation ? req.substr(3) : req,
        allCaps = treesaver.capabilities.caps_.concat(
          useMutable ? treesaver.capabilities.mutableCaps_ : []
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

      // Requirement may be a mutable property, need to check
      if (!useMutable &&
          treesaver.capabilities.mutableCapabilityList_.indexOf(rootReq) !== -1) {
          // Requirement isn't met, but is mutable, let it pass for now
          return true;
      }

      return false;
    }
  });
};
