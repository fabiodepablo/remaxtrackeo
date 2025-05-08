// models/MonthlyTrack.js
const mongoose = require('mongoose');

const MonthlyTrackSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  year:      { type: Number, required: true },
  month:     { type: Number, required: true },
  valores:   { type: Map, of: Number, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Un único registro por usuario/año/mes
MonthlyTrackSchema.index({ userId:1, year:1, month:1 }, { unique: true });

module.exports = mongoose.model('MonthlyTrack', MonthlyTrackSchema);
