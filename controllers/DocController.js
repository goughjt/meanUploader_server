var mongoose = require('mongoose');
var crypto = require('crypto');
var multiparty = require('multiparty');
var restful = require('node-restful');
var _ = require('lodash');
var kue = require('kue')
var queue = kue.createQueue();
var socketio = require('../helpers/socketio');

/* accept 20 simultaneous jobs*/
queue.process('conversion', 20, function(job, done){
  /* This is where the mysterious conversion happens*/
  /* A nice big 7s delay here for some dramatic tension*/
  setTimeout(done,7*1000);
});

var Model = {};
var io = {};

module.exports = function(app, route) {

  Model = mongoose.model('doc', app.models.doc);
  io = socketio.get();

  var Resource = restful.model('doc', app.models.doc).methods(['get', 'post']);

  Resource.before('get', removeFile);

  Resource.after('get', prepareAllDocsForFrontend);

  Resource.before('post', populateFields);

  Resource.after('post', pushNewDoc);
  Resource.after('post', createConversionJob);

  Resource.register(app, route);

  return function(req, res, next) {
    next();
  };

};

/* prettifyGetList and hashFilePath*/
function prepareDocForFrontend(x){
  var nameSeparator = /\.[^\.]+$/;
  x.name = x.name.search(nameSeparator) === -1 ? x.name : _.truncate(x.name, {'length': x.name.length-1, 'separator': nameSeparator, 'omission': ''});
  x.file_format = _.toUpper(_.last(_.split(x.file_format, '/')));
  x.file_path = sha256(x.file_path);
  /* This is a bad way of not revealing files - should edit query in before fxn*/
  x.file = null;
  return x;
}

function pushNewDoc(req, res, next) {
  io.emit('newDoc', prepareDocForFrontend(res.locals.bundle));
  next();
}

function prepareAllDocsForFrontend(req, res, next) {
  _.each(res.locals.bundle, function(x) {
    prepareDocForFrontend(x);
  });
  next();
}

/* Need this to work when move to storing file in mongoose Buffer rather than to filesystem...*/
function removeFile(req, res, next) {
  req.query = "?select=name%20created_at%20file_format%20status%20file_path";
  next();
}

function createConversionJob(req, res, next) {

  var mongoose_id = res.locals.bundle.id;

  var job = queue.create('conversion', {
    name: req.body.name,
    status: req.body.status,
  })
  /* RFC5424: severity of all levels is assumed to be numerically ascending from most important to least important*/
    .priority(req.body.file_format === 'application/pdf' ? 100 : 10)
    .attempts(2)
    .backoff( {type:'exponential'} )
    .ttl((req.body.file_format === 'application/pdf' ? 100 : 10)*1000)
  /* can also have ON promotion, progress, failed_attempt, failed, remove*/
    .on('enqueue', function() {
      updateStatus(mongoose_id, 'Queued', sha256(req.body.file_path));
    })
    .on('start', function() {
      updateStatus(mongoose_id, 'Processing', sha256(req.body.file_path));
    })
    .on('complete', function() {
      updateStatus(mongoose_id, 'Processed', sha256(req.body.file_path));
    })
    .save( function(err){
      //TODO: need error handling here
    })
  ;
  next();
}

function updateStatus(mongoose_id, new_status, hash_path) {
  Model.update( {_id: mongoose_id}, {status: new_status}, {}, function(){});
  io.emit('statusUpdate', {hashPath: hash_path, status: new_status});
}

function populateFields(req, res, next) {

  var options = {uploadDir: "./uploads"};
  var form = new multiparty.Form(options);
  form.parse(req, function(err, fields, files) {
    if(!files || !files.file)
      return;

    var file = files.file[0];

    req.body.name = _.trim(file.originalFilename);
    req.body.file_format = file.headers['content-type'];
    req.body.created_at = new Date();
    req.body.status = 'Queued';
    req.body.file_path = file.path;

    next();
  });
}

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("base64");
}
