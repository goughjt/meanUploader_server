var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var path = require('path');
var _ = require('lodash');
var multiparty = require('multiparty');

//create the app
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
require('./helpers/socketio').set(io);

//add middleware necessary for rest apis
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));

// When dealing with CORS (Cross-Origin Resource Sharing)
// requests, the client should pass-through its origin (the
// requesting domain). We should either echo that or use *
// if the origin was not passed.
app.use(function(req, res, next) {
  var origin = (req.headers.origin || "*")
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type');
  res.header('Access-Control-Allow-Credentials', true);
  next();
});

//connect to mongo db
mongoose.connect('mongodb://localhost/meanapp');
mongoose.connection.once('open', function() {
  //load the models
  app.models = require('./models/index');

  //load the routes
  var routes = require('./routes');
  _.each(routes, function(controller, route) {
    app.use(route, controller(app, route));
  });
  console.log('Listening on port 3000...');
  /* app.listen(3000);*/
  http.listen(3000);
  /* http.listen(3001);*/
  io.on('connection', function(socket){
    console.log('a user connected');
    socket.on('disconnect', function(){
      console.log('user disconnected');
    });
    socket.on('message', function(data){
      console.log(data);
    });
  });

});
