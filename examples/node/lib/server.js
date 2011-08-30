var express = require('express'),
    fs = require('fs'),
    path = require('path'),
    app = express.createServer();

function fast(req, res) {
  var file = 'index.html';
  if (req.originalUrl !== '/') {
    file = req.originalUrl.substr(1);
  }

  path.exists(file, function (exists) {
    if (exists) {
      var readStream = fs.createReadStream(file, {flags: 'r'});
      res.writeHead(200);
      readStream.pipe(res);
    } else {
      res.send(404);
    }
  });
}

function slow(req, res) {
  var file = req.params[0];
  path.exists(file, function (exists) {
    if (exists) {
      setTimeout(function () {
        res.writeHead(200);
        var readStream = fs.createReadStream(file, {flags: 'r'});
        readStream.pipe(res);
      }, 2000);
    } else {
      res.send(404);
    }
  });
}

app.get('/', fast);
app.get('/src/*', fast);
app.get('/lib/*', fast);
app.get('/test/*', fast);
app.get('/*', slow);

app.listen(3001);
