// models/PropertyTrack.js
const mongoose = require('mongoose');

const PropertyTrackSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tipo:             { type: String, required: true }, // e.g. local, depto, casa...
  propiedad:        { type: String, required: true }, // dirección
  contrato:         { type: String, enum: ['exclusiva','no exclusiva'], required: true },
  precioPublicacion:{ type: Number, required: true },
  precioAcm:        { type: Number, required: true },
  fechaCarga:       { type: Date,   required: true },
  valor:            { type: String, enum: ['si','no'], required: true },
  createdAt:        { type: Date,   default: Date.now },
  updatedAt:        { type: Date,   default: Date.now }
});

// Para filtrar rápido por usuario
PropertyTrackSchema.index({ userId:1 });

module.exports = mongoose.model('PropertyTrack', PropertyTrackSchema);
