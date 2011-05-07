goog.provide('treesaver.uri');

// URI parser, based on parseUri by Steven Levithan <stevenlevithan.com> (MIT License)
treesaver.uri._parserRegex = /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/;
treesaver.uri._keys = ["source", "scheme", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"];

treesaver.uri.parse = function (str) {
    var i = treesaver.uri._keys.length,
        m = treesaver.uri._parserRegex.exec(str),
        result = {};

    while (i--) {
        result[treesaver.uri._keys[i]] = m[i] || null;
    }
    return result;
};

treesaver.uri.stringify = function (o) {
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

treesaver.uri.isIndex = function (str) {
  return /(index|default)\.(html?|php|asp|aspx)$/i.test(str) ||
    (treesaver.config['DirectoryIndex'] &&
      str.lastIndexOf(treesaver.config['DirectoryIndex']) === (str.length - treesaver.config['DirectoryIndex'].length));
};

treesaver.uri.stripHash = function (str) {
  var tmp = treesaver.uri.parse(str);
  tmp.anchor = null;
  return treesaver.uri.stringify(tmp);
};

treesaver.uri.stripFile = function (str) {
  var tmp = treesaver.uri.parse(str);
  tmp.file = null;
  return treesaver.uri.stringify(tmp);
};
