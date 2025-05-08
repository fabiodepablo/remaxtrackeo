// models/Objective.js
const mongoose = require('mongoose');

const ObjectiveSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['anual','mensual'],
    required: true
  },
  year:  { type: Number, required: true },
  month: { type: Number, min: 1, max: 12 },   // solo para mensuales
  captacionExclusiva:           { type: Number, required: true, default: 0 },
  objetivoAnual:                { type: Number, required: true, default: 0 },
  premioConvencion:             { type: Number, required: true, default: 0 },
  comisionPromedioTransaccion:  { type: Number, required: true, default: 0 },
  sumaPrelistings:              { type: Number, required: true, default: 0 },
  transaccionesNecesarias:      { type: Number, required: true, default: 0 },
  totalAnualPrelistings:        { type: Number, required: true, default: 0 },
  totalMensualPrelistings:      { type: Number, required: true, default: 0 },
  createdBy:                    { type: String, required: true },
  createdAt:                    { type: Date,   default: Date.now }
});

// Un solo objetivo mensual por usuario/año/mes
ObjectiveSchema.index(
  { createdBy:1, type:1, year:1, month:1 },
  { unique: true, partialFilterExpression: { type: 'mensual' } }
);
// Un solo objetivo anual por usuario/año
ObjectiveSchema.index(
  { createdBy:1, type:1, year:1 },
  { unique: true, partialFilterExpression: { type: 'anual' } }
);

module.exports = mongoose.model('Objective', ObjectiveSchema);
