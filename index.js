var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var path = require('path');
var _ = require('lodash');
var multiparty = require('multiparty');

//create the app
var app = express();

//add middleware necessary for rest apis
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));

//CORS support
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type');
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
  app.listen(3000);
});

