const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  cropName: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.1,
  },
  unit: {
    type: String,
    required: true,
    enum: ['kg', 'quintal', 'ton', 'bag', 'unit'],
    default: 'kg',
  },
  pricePerUnit: {
    type: Number,
    required: true,
    min: 0,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  location: {
    state: { type: String, default: '' },
    district: { type: String, default: '' },
    village: { type: String, default: '' },
  },
  status: {
    type: String,
    enum: ['active', 'sold', 'cancelled'],
    default: 'active',
  },
  contactPhone: { type: String, default: '' },
  contactEmail: { type: String, default: '' },
}, {
  timestamps: true,
});

listingSchema.index({ sellerId: 1, status: 1 });
listingSchema.index({ status: 1, cropName: 1 });
listingSchema.index({ 'location.state': 1, status: 1 });

module.exports = mongoose.model('Listing', listingSchema);
