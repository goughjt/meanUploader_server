var kue = require('kue')

var queue = kue.createQueue();

/* accept 20 simultaneous jobs*/
queue.process('conversion', 20, function(job, done){
  /* This is where the mysterious conversion happens*/
  /* A nice big 7s delay here for some dramatic tension*/
  setTimeout(done,7*1000);
});

queue.on('error', (err) => {
  switch(err.code) {
    case "ECONNREFUSED":
      console.log('Redis could not connect. Is it running? If so, maybe the config needs tuning. To fix this problem, try running "redis-server" in a separate shell.');
    default:
      winston.info('There was an unidentified redis error');
  }
  server.stop();
});


exports.queue = queue;
