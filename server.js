var winston = require('winston');
var express = require('express');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var _ = require('lodash');

var app = express();
var httpServer = require('http').Server(app);
var io = require('socket.io')(httpServer);
require('./helpers/socketio').set(io);

//add middleware necessary for rest apis
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));

app.use(function(req, res, next) {
  var origin = (req.headers.origin || "*");
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type');
  res.header('Access-Control-Allow-Credentials', true);
  next();
});

function start() {
  app.models = require('./models/index');

  var routes = require('./routes');
  _.each(routes, function(controller, route) {
    app.use(route, controller(app, route));
  });
  httpServer.listen(3000);
  io.on('connection', function(socket){
    winston.info('a user connected');
    socket.on('disconnect', function(){
      winston.info('user disconnected');
    });
  });
}

exports.start = start;
exports.app = app;
