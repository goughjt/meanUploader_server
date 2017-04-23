var crypto = require('crypto');
var multiparty = require('multiparty');
var restful = require('node-restful');
var _ = require('lodash');

module.exports = function(app, route) {

  var Resource = restful.model(
    'doc',
    app.models.doc
  ).methods(['get', 'post']);

  Resource.before('get', removeFile);
  Resource.after('get', removeFile_BadWay);
  Resource.after('get', prettifyGetList);
  Resource.before('post', populateFields);

  Resource.register(app, route);

  return function(req, res, next){
    next();
  };
};

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

function populateFields(req, res, next) {

  var options = {uploadDir: "./uploads"};
  var form = new multiparty.Form(options);
  form.parse(req, function(err, fields, files) {
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
