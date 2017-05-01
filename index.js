var config = require('./config-debug');
var server = require('./server');
var mongoose = require('mongoose');
var winston = require('winston');

winston.add(winston.transports.File, {
  filename: config.logger.api
});

winston.handleExceptions(new winston.transports.File({
  filename: config.logger.exception
}));

mongoose.connect(config.db.mongodb, config.db.options, function(error) {
  if(error) {
    console.log('Mongodb could not connect. Is it running? If so, maybe the config needs tuning. To fix this problem, try running "mongod" in a separate shell.');
  }
});

mongoose.connection.once('open', function() {
  server.start();
});
