goog.require('treesaver.uri');

$(function () {
  module('uri');

  function uriEqual(str, obj, msg) {
    var result = treesaver.uri.parse(str),
        i = treesaver.uri._keys.length;

    while (i--) {
      if (treesaver.uri._keys[i] !== 'source') {
        obj[treesaver.uri._keys[i]] = obj[treesaver.uri._keys[i]] || null;
      } else {
        obj[treesaver.uri._keys[i]] = str;
      }
    }
    deepEqual(result, obj, msg);
  }


  test('scheme', function () {
    uriEqual('http:', {
      scheme: 'http'
    });

    uriEqual('https://', {
      scheme: 'https'
    });
  });

  test('host', function () {
    uriEqual('http://host', {
      host: 'host',
      authority: 'host',
      scheme: 'http'
    });

    uriEqual('http://host.com', {
      host: 'host.com',
      authority: 'host.com',
      scheme: 'http'
    });

    uriEqual('http://subdomain.host.com', {
      host: 'subdomain.host.com',
      authority: 'subdomain.host.com',
      scheme: 'http'
    });

    uriEqual('//host.com', {
      host: 'host.com',
      authority: 'host.com'
    });
  });

  test('port', function () {
    uriEqual('http://host.com:81', {
      port: '81',
      host: 'host.com',
      authority: 'host.com:81',
      scheme: 'http'
    });
  });

  test('user', function () {
    uriEqual('http://user@host.com', {
      host: 'host.com',
      user: 'user',
      userInfo: 'user',
      authority: 'user@host.com',
      scheme: 'http'
    });

    uriEqual('http://user:@host.com', {
      host: 'host.com',
      user: 'user',
      userInfo: 'user:',
      authority: 'user:@host.com',
      scheme: 'http'
    });

    uriEqual('http://user:pass@host.com', {
      host: 'host.com',
      password: 'pass',
      user: 'user',
      userInfo: 'user:pass',
      authority: 'user:pass@host.com',
      scheme: 'http'
    });
  });

  test('path', function () {
    uriEqual('/', {
      directory: '/',
      path: '/',
      relative: '/'
    });

    uriEqual('http://host/', {
      directory: '/',
      path: '/',
      relative: '/',
      host: 'host',
      authority: 'host',
      scheme: 'http'
    });

    uriEqual('/directory/', {
      directory: '/directory/',
      path: '/directory/',
      relative: '/directory/'
    });

    uriEqual('/file.ext', {
      file: 'file.ext',
      directory: '/',
      path: '/file.ext',
      relative: '/file.ext'
    });

    uriEqual('path/to/file', {
      file: 'file',
      directory: 'path/to/',
      path: 'path/to/file',
      relative: 'path/to/file'
    });

    uriEqual('localhost', {
      file: 'localhost',
      path: 'localhost',
      relative: 'localhost'
    });

    uriEqual('192.168.1.1', {
      file: '192.168.1.1',
      path: '192.168.1.1',
      relative: '192.168.1.1'
    });

    uriEqual('host.com', {
      file: 'host.com',
      path: 'host.com',
      relative: 'host.com'
    });

    uriEqual('host.com:81', {
      file: '81',
      path: '81',
      relative: '81',
      scheme: 'host.com'
    });

    uriEqual('host.com:81/', {
      directory: '81/',
      path: '81/',
      relative: '81/',
      scheme: 'host.com'
    });

    uriEqual('host.com/', {
      directory: 'host.com/',
      path: 'host.com/',
      relative: 'host.com/'
    });

    uriEqual('host.com/file.ext', {
      file: 'file.ext',
      directory: 'host.com/',
      path: 'host.com/file.ext',
      relative: 'host.com/file.ext'
    });
  });

  test('anchor', function () {
    uriEqual('/#anchor', {
      anchor: 'anchor',
      directory: '/',
      path: '/',
      relative: '/#anchor'
    });

    uriEqual('#anchor', {
      anchor: 'anchor',
      relative: '#anchor'
    });

    uriEqual('host.com#anchor', {
      anchor: 'anchor',
      file: 'host.com',
      path: 'host.com',
      relative: 'host.com#anchor'
    });
  });


  test('query', function () {
    uriEqual('?query', {
      query: 'query',
      relative: '?query'
    });

    uriEqual('/?query', {
      query: 'query',
      directory: '/',
      path: '/',
      relative: '/?query'
    });

    uriEqual('?query=1&test=2#anchor', {
      anchor: 'anchor',
      query: 'query=1&test=2',
      relative: '?query=1&test=2#anchor'
    });

    uriEqual('http://host.com?query', {
      query: 'query',
      relative: '?query',
      host: 'host.com',
      authority: 'host.com',
      scheme: 'http'
    });

    uriEqual('host.com?query', {
      query: 'query',
      file: 'host.com',
      path: 'host.com',
      relative: 'host.com?query'
    });
  });

  test('all', function () {
    uriEqual('http://user:pass@host.com:81#anchor', {
      anchor: 'anchor',
      relative: '#anchor',
      port: '81',
      host: 'host.com',
      password: 'pass',
      user: 'user',
      userInfo: 'user:pass',
      authority: 'user:pass@host.com:81',
      scheme: 'http'
    });

    uriEqual('http://user:pass@host.com:81/', {
      directory: '/',
      path: '/',
      relative: '/',
      port: '81',
      host: 'host.com',
      password: 'pass',
      user: 'user',
      userInfo: 'user:pass',
      authority: 'user:pass@host.com:81',
      scheme: 'http'
    });

    uriEqual('http://user:pass@host.com:81/?query', {
      query: 'query',
      directory: '/',
      path: '/',
      relative: '/?query',
      port: '81',
      host: 'host.com',
      password: 'pass',
      user: 'user',
      userInfo: 'user:pass',
      authority: 'user:pass@host.com:81',
      scheme: 'http'
    });

    uriEqual('http://user:pass@host.com:81/#anchor', {
      anchor: 'anchor',
      directory: '/',
      path: '/',
      relative: '/#anchor',
      port: '81',
      host: 'host.com',
      password: 'pass',
      user: 'user',
      userInfo: 'user:pass',
      authority: 'user:pass@host.com:81',
      scheme: 'http'
    });

    uriEqual('http://user:pass@host.com:81/file.ext', {
      file: 'file.ext',
      directory: '/',
      path: '/file.ext',
      relative: '/file.ext',
      port: '81',
      host: 'host.com',
      password: 'pass',
      user: 'user',
      userInfo: 'user:pass',
      authority: 'user:pass@host.com:81',
      scheme: 'http'
    });

    uriEqual('http://user:pass@host.com:81/directory', {
      file: 'directory',
      directory: '/',
      path: '/directory',
      relative: '/directory',
      port: '81',
      host: 'host.com',
      password: 'pass',
      user: 'user',
      userInfo: 'user:pass',
      authority: 'user:pass@host.com:81',
      scheme: 'http'
    });

    uriEqual('http://user:pass@host.com:81/directory?query', {
      query: 'query',
      file: 'directory',
      directory: '/',
      path: '/directory',
      relative: '/directory?query',
      port: '81',
      host: 'host.com',
      password: 'pass',
      user: 'user',
      userInfo: 'user:pass',
      authority: 'user:pass@host.com:81',
      scheme: 'http'
    });

    uriEqual('http://user:pass@host.com:81/directory#anchor', {
      anchor: 'anchor',
      file: 'directory',
      directory: '/',
      path: '/directory',
      relative: '/directory#anchor',
      port: '81',
      host: 'host.com',
      password: 'pass',
      user: 'user',
      userInfo: 'user:pass',
      authority: 'user:pass@host.com:81',
      scheme: 'http'
    });

    uriEqual('http://user:pass@host.com:81/directory/', {
      directory: '/directory/',
      path: '/directory/',
      relative: '/directory/',
      port: '81',
      host: 'host.com',
      password: 'pass',
      user: 'user',
      userInfo: 'user:pass',
      authority: 'user:pass@host.com:81',
      scheme: 'http'
    });

    uriEqual('http://user:pass@host.com:81/directory/?query', {
      query: 'query',
      directory: '/directory/',
      path: '/directory/',
      relative: '/directory/?query',
      port: '81',
      host: 'host.com',
      password: 'pass',
      user: 'user',
      userInfo: 'user:pass',
      authority: 'user:pass@host.com:81',
      scheme: 'http'
    });

    uriEqual('http://user:pass@host.com:81/directory/#anchor', {
      anchor: 'anchor',
      directory: '/directory/',
      path: '/directory/',
      relative: '/directory/#anchor',
      port: '81',
      host: 'host.com',
      password: 'pass',
      user: 'user',
      userInfo: 'user:pass',
      authority: 'user:pass@host.com:81',
      scheme: 'http'
    });

    uriEqual('http://user:pass@host.com:81/directory/sub.directory/', {
      directory: '/directory/sub.directory/',
      path: '/directory/sub.directory/',
      relative: '/directory/sub.directory/',
      port: '81',
      host: 'host.com',
      password: 'pass',
      user: 'user',
      userInfo: 'user:pass',
      authority: 'user:pass@host.com:81',
      scheme: 'http'
    });

    uriEqual('http://user:pass@host.com:81/directory/sub.directory/file.ext', {
      file: 'file.ext',
      directory: '/directory/sub.directory/',
      path: '/directory/sub.directory/file.ext',
      relative: '/directory/sub.directory/file.ext',
      port: '81',
      host: 'host.com',
      password: 'pass',
      user: 'user',
      userInfo: 'user:pass',
      authority: 'user:pass@host.com:81',
      scheme: 'http'
    });

    uriEqual('http://user:pass@host.com:81/directory/file.ext?query', {
      query: 'query',
      file: 'file.ext',
      directory: '/directory/',
      path: '/directory/file.ext',
      relative: '/directory/file.ext?query',
      port: '81',
      host: 'host.com',
      password: 'pass',
      user: 'user',
      userInfo: 'user:pass',
      authority: 'user:pass@host.com:81',
      scheme: 'http'
    });

    uriEqual('http://user:pass@host.com:81/directory/file.ext?query=1&test=2', {
      query: 'query=1&test=2',
      file: 'file.ext',
      directory: '/directory/',
      path: '/directory/file.ext',
      relative: '/directory/file.ext?query=1&test=2',
      port: '81',
      host: 'host.com',
      password: 'pass',
      user: 'user',
      userInfo: 'user:pass',
      authority: 'user:pass@host.com:81',
      scheme: 'http'
    });

    uriEqual('http://user:pass@host.com:81/directory/file.ext?query=1#anchor', {
      anchor: 'anchor',
      query: 'query=1',
      file: 'file.ext',
      directory: '/directory/',
      path: '/directory/file.ext',
      relative: '/directory/file.ext?query=1#anchor',
      port: '81',
      host: 'host.com',
      password: 'pass',
      user: 'user',
      userInfo: 'user:pass',
      authority: 'user:pass@host.com:81',
      scheme: 'http'
    });

    uriEqual('//user:pass@host.com:81/direc.tory/file.ext?query=1&test=2#anchor', {
      anchor: 'anchor',
      query: 'query=1&test=2',
      file: 'file.ext',
      directory: '/direc.tory/',
      path: '/direc.tory/file.ext',
      relative: '/direc.tory/file.ext?query=1&test=2#anchor',
      port: '81',
      host: 'host.com',
      password: 'pass',
      user: 'user',
      userInfo: 'user:pass',
      authority: 'user:pass@host.com:81'
    });

    uriEqual('/directory/sub.directory/file.ext?query=1&test=2#anchor', {
      anchor: 'anchor',
      query: 'query=1&test=2',
      file: 'file.ext',
      directory: '/directory/sub.directory/',
      path: '/directory/sub.directory/file.ext',
      relative: '/directory/sub.directory/file.ext?query=1&test=2#anchor'
    });

    uriEqual('user:pass@host.com:81/direc.tory/file.ext?query=1&test=2#anchor', {
      anchor: 'anchor',
      query: 'query=1&test=2',
      file: 'file.ext',
      directory: 'pass@host.com:81/direc.tory/',
      path: 'pass@host.com:81/direc.tory/file.ext',
      relative: 'pass@host.com:81/direc.tory/file.ext?query=1&test=2#anchor',
      scheme: 'user'
    });
  });

  test('stringify', function () {
    var tests = ["http:", "https://", "http://host", "http://host/", "http://host.com", "http://subdomain.host.com", "http://host.com:81", "http://user@host.com", "http://user@host.com:81", "http://user:@host.com", "http://user:@host.com:81", "http://user:pass@host.com", "http://user:pass@host.com:81", "http://user:pass@host.com:81?query", "http://user:pass@host.com:81#anchor", "http://user:pass@host.com:81/", "http://user:pass@host.com:81/?query", "http://user:pass@host.com:81/#anchor", "http://user:pass@host.com:81/file.ext", "http://user:pass@host.com:81/directory", "http://user:pass@host.com:81/directory?query", "http://user:pass@host.com:81/directory#anchor", "http://user:pass@host.com:81/directory/", "http://user:pass@host.com:81/directory/?query", "http://user:pass@host.com:81/directory/#anchor", "http://user:pass@host.com:81/directory/sub.directory/", "http://user:pass@host.com:81/directory/sub.directory/file.ext", "http://user:pass@host.com:81/directory/file.ext?query", "http://user:pass@host.com:81/directory/file.ext?query=1&test=2", "http://user:pass@host.com:81/directory/file.ext?query=1#anchor", "//host.com", "//user:pass@host.com:81/direc.tory/file.ext?query=1&test=2#anchor", "/directory/sub.directory/file.ext?query=1&test=2#anchor", "/directory/", "/file.ext", "/?query", "/#anchor", "/", "?query", "?query=1&test=2#anchor", "#anchor", "path/to/file", "localhost", "192.168.1.1", "host.com", "host.com:81", "host.com:81/", "host.com?query", "host.com#anchor", "host.com/", "host.com/file.ext", "host.com/directory/?query", "host.com/directory/#anchor", "host.com/directory/file.ext", "host.com:81/direc.tory/file.ext?query=1&test=2#anchor", "user@host.com", "user@host.com:81", "user@host.com/", "user@host.com/file.ext", "user@host.com?query", "user@host.com#anchor", "user:pass@host.com:81/direc.tory/file.ext?query=1&test=2#anchor"];

    tests.forEach(function (test) {
      equals(treesaver.uri.stringify(treesaver.uri.parse(test)), test);
    });
  });
});
