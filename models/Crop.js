const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  scientificName: String,
  localNames: {
    hindi: String,
    telugu: String,
    kannada: String,
    tamil: String,
    malayalam: String
  },
  description: {
    type: String,
    required: true
  },
  seasons: [{
    type: String,
    enum: ['kharif', 'rabi', 'zaid', 'year-round']
  }],
  soilTypes: [{
    type: String,
    enum: ['black', 'red', 'laterite', 'alluvial', 'mountain', 'saline', 'desert']
  }],
  climate: {
    temperature: {
      min: Number,
      max: Number
    },
    rainfall: {
      min: Number,
      max: Number
    },
    humidity: {
      min: Number,
      max: Number
    }
  },
  planting: {
    spacing: {
      row: Number,
      plant: Number
    },
    depth: Number,
    seedRate: Number,
    plantingTime: String
  },
  irrigation: {
    frequency: String,
    waterRequirement: Number,
    methods: [String]
  },
  fertilization: {
    npk: {
      nitrogen: Number,
      phosphorus: Number,
      potassium: Number
    },
    organic: [String],
    schedule: [{
      stage: String,
      fertilizer: String,
      quantity: String,
      timing: String
    }]
  },
  pestControl: {
    commonPests: [String],
    pesticides: [{
      name: String,
      activeIngredient: String,
      dosage: String,
      application: String,
      safetyPeriod: Number
    }],
    organicControl: [String]
  },
  harvesting: {
    maturityPeriod: Number, // in days
    indicators: [String],
    method: String,
    yield: {
      min: Number,
      max: Number,
      unit: String
    }
  },
  marketPrice: {
    current: Number,
    unit: String,
    currency: String
  },
  preferredLocations: [String], // States/regions where crop is commonly grown
  images: [String],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Crop', cropSchema);
