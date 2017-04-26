var mongoose = require('mongoose');
var crypto = require('crypto');
var multiparty = require('multiparty');
var restful = require('node-restful');
var _ = require('lodash');
var kue = require('kue')
  , queue = kue.createQueue();

/* accept 20 simultaneous jobs*/
queue.process('conversion', 20, function(job, done){
  /* This is where the mysterious conversion happens*/
  /* A nice big 7s delay here for some dramatic tension*/
  setTimeout(done,7*1000);
});

var Model = {};

module.exports = function(app, route) {

  Model = mongoose.model('doc', app.models.doc);
  var Resource = restful.model('doc', app.models.doc).methods(['get', 'post']);

  Resource.before('get', removeFile);

  Resource.after('get', hashFilePath);
  Resource.after('get', prettifyGetList);

  Resource.before('post', populateFields);

  Resource.after('post', pushNewDoc);
  Resource.after('post', createConversionJob);

  Resource.register(app, route);

  return function(req, res, next) {
    next();
  };

};

function pushNewDoc(req, res, next) {
  var io = require('../helpers/socketio').get();
  io.emit('newDoc', '');
}

function pushStatusUpdate(statusUpdate) {
  var io = require('../helpers/socketio').get();
  io.emit('statusUpdate', statusUpdate);
}

function prettifyGetList(req, res, next) {
  var nameSeparator = /\.[^\.]+$/;
  _.each(res.locals.bundle, function(x){
    x.name = x.name.search(nameSeparator) === -1 ? x.name : _.truncate(x.name, {'length': x.name.length-1, 'separator': nameSeparator, 'omission': ''});
    x.file_format = _.toUpper(_.last(_.split(x.file_format, '/')));
  });
  next();
}

function hashFilePath(req, res, next) {
  _.each(res.locals.bundle, function(x) {
    x.file_path = sha256(x.file_path);
    /* This is a bad way of not revealing files - should edit query in before fxn*/
    x.file = null;
  });
  next();
}

/* Need this to work when move to storing file in mongoose Buffer rather than to filesystem...*/
function removeFile(req, res, next) {
  req.query = "?select=name%20created_at%20file_format%20status%20file_path";
  next();
}

function createConversionJob(req, res, next) {
  var job = queue.create('conversion', {
    mongoose_id: res.locals.bundle.id,
    name: req.body.name,
    status: req.body.status,
  })
  /* with kue, the priority convention of low and high is counterintuitive (for me): high number value = low priority*/
    .priority(req.body.file_format === 'application/pdf' ? 100 : 10)
    .attempts(2)
    .backoff( {type:'exponential'} )
    .ttl((req.body.file_format === 'application/pdf' ? 100 : 10)*1000)
  /* can also have ON promotion, progress, failed_attempt, failed, remove*/
    .on('enqueue', function() {
      Model.update( {file_path: req.body.file_path}, {status: 'Queued'}, {}, function(e) {
        console.log(e);
      });
      pushStatusUpdate({hashPath: sha256(req.body.file_path),status: 'Queued'});
    })
    .on('start', function() {
      Model.update( {file_path: req.body.file_path}, {status: 'Processing'}, {}, function(e) {
        console.log(e);
      });
      pushStatusUpdate({hashPath: sha256(req.body.file_path),status: 'Processing'});
    })
    .on('complete', function() {
      Model.update( {file_path: req.body.file_path}, {status: 'Processed'}, {}, function(e) {
        console.log(e);
      });
      pushStatusUpdate({hashPath: sha256(req.body.file_path),status: 'Processed'});
    })
    .save( function(err){
      if( !err ) console.log( job.id );
    })
  ;
  next();
}

function populateFields(req, res, next) {

  var options = {uploadDir: "./uploads"};
  var form = new multiparty.Form(options);
  form.parse(req, function(err, fields, files) {
    if(!files || !files.file)
      return;

    var file = files.file[0];
    console.log(file);

    req.body.name = _.trim(file.originalFilename);
    req.body.file_format = file.headers['content-type'];
    req.body.created_at = new Date();
    req.body.status = 'Queued';
    req.body.file_path = file.path;

    console.log(req.body);
    next();
  });
}

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("base64");
}
