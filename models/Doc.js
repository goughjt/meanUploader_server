var mongoose = require('mongoose');

//create the doc schema
var DocSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  created_at: {
    type: Date,
    required: true
  },
  file_format: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true
  },
  filepath: {
    type: String,
    required: true
  }
});

//export the module for nodejs
module.exports = DocSchema;
