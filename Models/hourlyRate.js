const mongoose = require('mongoose');

const hourlyRateSchema = new mongoose.Schema({
  hourlyRate: { type: Number, required: true },
});

module.exports = mongoose.model('hourlyRate', hourlyRateSchema);
