const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Buyer',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    trim: true,
    default: '',
    maxlength: 400
  }
}, { timestamps: true });

reviewSchema.index({ listingId: 1 });
reviewSchema.index({ sellerId: 1, createdAt: -1 });
reviewSchema.index({ buyerId: 1, listingId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
