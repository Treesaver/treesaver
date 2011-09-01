/**
 * @fileoverview Retrieve files via XMLHttpRequest.
 */

goog.provide('treesaver.network');

goog.require('treesaver.capabilities');
goog.require('treesaver.debug');
goog.require('treesaver.events');
goog.require('treesaver.scheduler');

goog.scope(function() {
  var network = treesaver.network,
      capabilities = treesaver.capabilities,
      debug = treesaver.debug,
      events = treesaver.events,
      scheduler = treesaver.scheduler;

  /**
   * @private
   * @const
   * @type {number}
   */
  network.DEFAULT_TIMEOUT = 10000; // 10 seconds

  /**
   * Network events fired
   * @const
   * @type {Object.<string, string>}
   */
  network.events = {
    ONLINE: 'treesaver.online',
    OFFLINE: 'treesaver.offline'
  };

  /**
   * Browser events watched
   * @private
   * @const
   * @type {Array.<string>}
   */
  network.watchedEvents_ = [
    'offline',
    'online'
  ];

  /**
   * Cache events watched (on document, not window)
   * @private
   * @const
   * @type {Array.<string>}
   */
  network.watchedCacheEvents_ = [
    'uncached',
    'idle',
    'checking',
    'downloading',
    'updateready',
    'obsolete'
  ];

  /**
   * Whether the network library is loaded
   * @private
   * @type {boolean}
   */
  network.isLoaded_ = false;

  /**
   * Initialize the network module, hook up event handlers, etc
   */
  network.load = function() {
    if (!network.isLoaded_) {
      network.isLoaded_ = true;

      // Hook up event handlers
      network.watchedEvents_.forEach(function(evt) {
        events.addListener(document, evt, network);
      });

      if (capabilities.SUPPORTS_APPLICATIONCACHE &&
          // FF3.5 gets nasty if you try to add event handlers to an uncached page
          // (specifically, it won't let you add event handlers to the cache obj)
          network.loadedFromCache_) {
        network.watchedCacheEvents_.forEach(function(evt) {
          events.addListener(window.applicationCache, evt, network);
        });
      }
    }
  };

  /**
   * Unload handlers and cleanup
   */
  network.unload = function() {
    if (network.isLoaded_) {
      network.isLoaded_ = false;

      // Unhook event handlers
      network.watchedEvents_.forEach(function(evt) {
        events.removeListener(window, evt, network);
      });
      // Unhook cache handlers only if they were set (avoid FF3.5 bug from above)
      if (capabilities.SUPPORTS_APPLICATIONCACHE &&
          network.loadedFromCache_) {
        network.watchedCacheEvents_.forEach(function(evt) {
          events.removeListener(window.applicationCache, evt, network);
        });
      }

      // TODO: Cancel outstanding requests
    }
  };

  /**
   * Internal storage for online status, since it can be set manually
   *
   * @private
   * @type {boolean}
   */
  network.onlineStatus_ = 'onLine' in window.navigator ?
    // TODO: What's a good fallback option here? IE8, and recent FF/WebKit support
    // navigator.onLine, so perhaps we just don't worry about this too much
    window.navigator.onLine : true;

  /**
   * @return {boolean} True if browser has an internet connection.
   */
  network.isOnline = function() {
    return network.onlineStatus_;
  };

  /**
   * Sets the online status
   *
   * @param {boolean} onLine True if should behave as if online.
   */
  network.setOnlineStatus = function(onLine) {
    network.onlineStatus_ = onLine;

    // TODO: Refactor this and create an event handler in capabilities, some
    // `capabilitiesChanged` event perhaps?
    capabilities.updateClasses();

    // Fire Treesaver event
    events.fireEvent(window,
      onLine ? network.events.ONLINE : network.events.OFFLINE);
  };

  /**
   * @private
   * @type {boolean}
   */
  network.loadedFromCache_ =
    capabilities.SUPPORTS_APPLICATIONCACHE &&
    // 0 = UNCACHED, anything else means page was cached on load
    !!window.applicationCache.status;

  /**
   * @return {boolean} True if the browser cache was active during boot.
   */
  network.loadedFromCache = function() {
    return network.loadedFromCache_;
  };

  /**
   * Handle events
   * @param {Event} e
   */
  network['handleEvent'] = function(e) {
    debug.info('Network event recieved: ' + e);

    switch (e.type) {
    case 'online':
      debug.info('Application online');

      network.setOnlineStatus(true);

      return;

    case 'offline':
      debug.info('Application offline');

      network.setOnlineStatus(false);

      return;

    case 'updateready':
      debug.info('Updating application cache');

      // New version of cached element is ready, hot swap
      window.applicationCache.swapCache();

      // TODO: Force reload of app in order to get new JS and content?

      return;

    case 'error':
      debug.warn('Application Cache Error: ' + e);

      // TODO: ???
      return;
    }
  };

  /**
   * @private
   * @const
   * @type {!RegExp}
   */
  network.protocolRegex_ = /^https?:\/\//i;

  /**
   * @param {!string} rel_path
   * @return {!string} An absolute URL.
   */
  network.absoluteURL = function(rel_path) {
    // Shortcut anything that starts with slash
    if (rel_path && rel_path[0] === '/' || network.protocolRegex_.test(rel_path)) {
      return rel_path;
    }

    var a = document.createElement('a'),
        div,
        url;

    a.href = rel_path;
    url = a.href;

    return url;
  };

  /**
   * @param {!string} url
   * @param {?function()} callback
   * @param {number=} timeout
   */
  network.get = function get(url, callback, timeout) {
    debug.info('XHR request to: ' + url);

    var request = {
      xhr: new XMLHttpRequest(),
      url: url,
      callback: callback
    };

    scheduler.delay(
      function() {
        network.requestTimeout_(request);
      },
      timeout || network.DEFAULT_TIMEOUT,
      [],
      network.makeRequestId_(request)
    );

    // Setup timeout
    request.xhr.onreadystatechange = network.createHandler_(request);

    try {
      // IE will throw if you try X-domain
      request.xhr.open('GET', request.url, true);
      request.xhr.send(null);
    }
    catch (e) {
      debug.warn('XHR Request exception: ' + e);

      network.requestError_(request);
    }
  };

  /**
   * @private
   */
  network.makeRequestId_ = function(request) {
    // TODO: Make unique across repeated requests?
    return 'fetch:' + request.url;
  };

  /**
   * @private
   */
  network.createHandler_ = function createHandler_(request) {
    return function() {
      if (request.xhr.readyState === 4) {
        // Requests from local file system give 0 status
        // This happens in IOS wrapper, as well as packaged Chrome web store
        if (request.xhr.status === 0 ||
            (request.xhr.status === 200 || request.xhr.status === 304)) {
          debug.info('XHR response from: ' + request.url);
          request.callback(request.xhr.responseText, request.url);
          network.cleanupRequest_(request);
        }
        else {
          debug.warn('XHR request failed for: ' + request.url);

          network.requestError_(request);
        }
      }
    };
  };

  /**
   * @private
   */
  network.cleanupRequest_ = function cleanupRequest_(request) {
    // Remove timeout
    scheduler.clear(network.makeRequestId_(request));
    // Clear reference
    request.xhr.onreadystatechange = null;
  };

  /**
   * @private
   */
  network.requestError_ = function requestError_(request) {
    // Failed for some reason; TODO: Error handling / event?
    request.callback(null, request.url);
    network.cleanupRequest_(request);
  };

  /**
   * @private
   */
  network.requestTimeout_ = function requestTimeout_(request) {
    request.xhr.abort();
    network.requestError_(request);
  };

  if (WITHIN_IOS_WRAPPER) {
    goog.exportSymbol('treesaver.setOnlineStatus', network.setOnlineStatus);
  }
});
