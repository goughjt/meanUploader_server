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

module.exports = function(app, route) {

  var Resource = restful.model(
    'doc',
    app.models.doc
  ).methods(['get', 'post']);

  Resource.before('get', removeFile);

  Resource.after('get', removeFile_BadWay);
  Resource.after('get', prettifyGetList);

  Resource.before('post', populateFields);

  Resource.after('post', createConversionJob);

  Resource.register(app, route);

  return function(req, res, next) {
    next();
  };

};

function pushNotification(message) {
  var io = require('../helpers/socketio').get();
  io.emit('message', message);
}

function prettifyGetList(req, res, next) {
  var nameSeparator = /\.[^\.]+$/;
  _.each(res.locals.bundle, function(x){
    x.name = x.name.search(nameSeparator) === -1 ? x.name : _.truncate(x.name, {'length': x.name.length-1, 'separator': nameSeparator, 'omission': ''});
    x.file_format = _.toUpper(_.last(_.split(x.file_format, '/')));
  });
  next();
}

/* This is a bad way of not revealing filepaths - should edit query in before fxn*/
function removeFile_BadWay(req, res, next) {
  _.each(res.locals.bundle, function(x) {
    x.filepath = null;
  });
  next();
}

/* It would be nice if this worked...*/
function removeFile(req, res, next) {
  req.query = "?select=name%20created_at%20file_format%20status";
  next();
}

function createConversionJob(req, res, next){
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
      pushNotification(req.body.name + ' is Queued');
    })
    .on('start', function() {
      pushNotification(req.body.name + ' is Processing');
    })
    .on('complete', function() {
      pushNotification(req.body.name + ' is Processed');
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
    req.body.filepath = file.path;

    console.log(req.body);
    next();
  });
}

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("base64");
}
