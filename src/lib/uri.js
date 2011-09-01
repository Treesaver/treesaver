goog.provide('treesaver.uri');

goog.scope(function() {
  var uri = treesaver.uri;

  // URI parser, based on parseUri by Steven Levithan <stevenlevithan.com> (MIT License)
  uri._parserRegex = /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/;
  uri._keys = ['source', 'scheme', 'authority', 'userInfo', 'user', 'password', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'anchor'];

  uri.parse = function(str) {
      var i = uri._keys.length,
          m = uri._parserRegex.exec(str),
          result = {};

      while (i--) {
          result[uri._keys[i]] = m[i] || null;
      }
      return result;
  };

  uri.stringify = function(o) {
      var result = '';

      if (o['scheme']) {
          result += o['scheme'] + ':';
      }

      if (o['source'] && /^(?:[^:\/?#]+:)?\/\//.test(o['source'])) {
          result += '//';
      }

      if (o['authority']) {
          if (o['userInfo']) {
              result += o['user'] || '';
              if (o['userInfo'].indexOf(':') !== -1) {
                  result += ':';
              }
              result += o['password'] || '';
              result += '@';
          }
          result += o['host'] || '';

          if (o['port'] !== null) {
              result += ':' + o['port'];
          }
      }

      if (o['relative']) {
          if (o['path']) {
              result += o['directory'] || '';
              result += o['file'] || '';
          }

          if (o['query']) {
              result += '?' + o['query'];
          }

          if (o['anchor']) {
              result += '#' + o['anchor'];
          }
      }
      return result;
  };

  uri.isIndex = function(str) {
    var url = uri.parse(str);

    if (url.file) {
      return (/^(index|default)\.(html?|php|asp|aspx)$/i.test(url.file) || (treesaver.ui.ArticleManager.index && treesaver.ui.ArticleManager.index.get('DirectoryIndex', 'index.html') === url.file));
    }
    else {
      return false;
    }
  };

  uri.stripHash = function(str) {
    var tmp = uri.parse(str);
    tmp.anchor = null;
    return uri.stringify(tmp);
  };

  uri.stripFile = function(str) {
    var tmp = uri.parse(str);
    tmp.file = null;
    return uri.stringify(tmp);
  };
});
