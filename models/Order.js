const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', required: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  quantity: { type: Number, required: true, min: 0.1 },
  status: { type: String, enum: ['pending', 'accepted', 'confirmed', 'delivered', 'rejected', 'cancelled'], default: 'pending' },
}, { timestamps: true });

orderSchema.index({ buyerId: 1, createdAt: -1 });
orderSchema.index({ listingId: 1 });

module.exports = mongoose.model('Order', orderSchema);
