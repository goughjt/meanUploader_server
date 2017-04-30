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

mongoose.connect(config.db.mongodb);
mongoose.connection.once('open', function() {
  server.start();
});
