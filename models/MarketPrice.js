const mongoose = require('mongoose');

const marketPriceSchema = new mongoose.Schema({
  cropName: {
    type: String,
    required: true,
    lowercase: true
  },
  commodity: String,
  location: {
    type: String,
    default: 'All-India'
  },
  mandiName: String,
  currentPrice: Number,
  minPrice: Number,
  maxPrice: Number,
  modalPrice: Number,
  unit: {
    type: String,
    default: 'per quintal'
  },
  currency: {
    type: String,
    default: 'INR'
  },
  arrivalDate: Date,
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  source: {
    type: String,
    enum: [
      'Agmarknet',
      'Mock',
      'Local',
      'OpenAI (Estimated)',
      'Alternate (Simulated)',
      'Alternate',
      'Cached (Offline)'
    ],
    default: 'Mock'
  },
  agmarknetId: String,
  // Cache metadata
  ttl: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hour TTL
  }
});

// TTL index - auto-delete after 30 days
marketPriceSchema.index({ lastUpdated: 1 }, { expireAfterSeconds: 2592000 });

// Compound index for fast lookups
marketPriceSchema.index({ cropName: 1, location: 1, lastUpdated: -1 });

module.exports = mongoose.model('MarketPrice', marketPriceSchema);
