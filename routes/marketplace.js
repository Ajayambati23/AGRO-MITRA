const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Listing = require('../models/Listing');
const User = require('../models/User');
const Order = require('../models/Order');
const Review = require('../models/Review');
const Buyer = require('../models/Buyer');
const NotificationService = require('../services/notificationService');

const router = express.Router();
const notificationService = new NotificationService();

async function sendCommerceAlert(contact, subject, message) {
  if (!contact) return;
  try {
    await notificationService.sendFarmerAlert(
      contact,
      {
        subject,
        message,
        channel: 'both'
      },
      'english'
    );
  } catch (error) {
    console.error('Marketplace alert error:', error.message);
  }
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }
  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

function authenticateBuyerToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }
  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, payload) => {
    if (err || !payload?.buyerId) return res.status(403).json({ message: 'Invalid or expired buyer token' });
    req.buyer = payload;
    next();
  });
}

async function getSellerRatingSummary(sellerId) {
  const rows = await Review.aggregate([
    { $match: { sellerId } },
    {
      $group: {
        _id: '$sellerId',
        avgRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);
  const summary = rows[0];
  if (!summary) return { avgRating: null, totalReviews: 0 };
  return {
    avgRating: Number(summary.avgRating.toFixed(1)),
    totalReviews: summary.totalReviews
  };
}

// Create listing (farmer only, auth required)
router.post('/listings', authenticateToken, [
  body('cropName').trim().isLength({ min: 1 }).withMessage('Crop name is required'),
  body('quantity').isFloat({ min: 0.1 }).withMessage('Valid quantity required'),
  body('unit').isIn(['kg', 'quintal', 'ton', 'bag', 'unit']).withMessage('Invalid unit'),
  body('pricePerUnit').isFloat({ min: 0 }).withMessage('Valid price required'),
  body('description').optional().trim(),
  body('location').optional().isObject(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const user = await User.findById(req.user.userId).select('phone email location');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { cropName, quantity, unit, pricePerUnit, description, location } = req.body;
    const listing = new Listing({
      sellerId: req.user.userId,
      cropName,
      quantity,
      unit,
      pricePerUnit,
      description: description || '',
      location: location || user.location || {},
      contactPhone: user.phone || '',
      contactEmail: user.email || '',
    });
    await listing.save();
    const populated = await Listing.findById(listing._id).populate('sellerId', 'name email phone location');
    res.status(201).json({ listing: populated });
  } catch (err) {
    console.error('Create listing error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get my listings (farmer, auth required)
router.get('/listings/my', authenticateToken, async (req, res) => {
  try {
    const listings = await Listing.find({ sellerId: req.user.userId })
      .sort({ createdAt: -1 });
    res.json({ listings });
  } catch (err) {
    console.error('My listings error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update listing (farmer, auth required)
router.patch('/listings/:id', authenticateToken, async (req, res) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, sellerId: req.user.userId });
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    const { cropName, quantity, unit, pricePerUnit, description, location, status } = req.body;
    if (cropName != null) listing.cropName = cropName;
    if (quantity != null) listing.quantity = quantity;
    if (unit != null) listing.unit = unit;
    if (pricePerUnit != null) listing.pricePerUnit = pricePerUnit;
    if (description != null) listing.description = description;
    if (location != null) listing.location = location;
    if (status != null) listing.status = status;
    await listing.save();
    res.json({ listing });
  } catch (err) {
    console.error('Update listing error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete listing (farmer, auth required)
router.delete('/listings/:id', authenticateToken, async (req, res) => {
  try {
    const listing = await Listing.findOneAndDelete({ _id: req.params.id, sellerId: req.user.userId });
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    res.json({ message: 'Listing removed' });
  } catch (err) {
    console.error('Delete listing error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Browse all active listings (public – for buyer portal, no auth)
router.get('/listings/browse', async (req, res) => {
  try {
    const { state, cropName, limit = 50, page = 1 } = req.query;
    const query = { status: 'active' };
    if (state) query['location.state'] = new RegExp(state, 'i');
    if (cropName) query.cropName = new RegExp(cropName, 'i');
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, parseInt(limit, 10) || 50);
    const limitNum = Math.min(100, parseInt(limit, 10) || 50);
    const listings = await Listing.find(query)
      .populate('sellerId', 'name phone location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const listingsWithRating = await Promise.all(
      listings.map(async (l) => ({
        ...l,
        sellerRating: await getSellerRatingSummary(l.sellerId?._id || l.sellerId)
      }))
    );

    const total = await Listing.countDocuments(query);
    res.json({ listings: listingsWithRating, total, page: parseInt(page, 10) || 1, limit: limitNum });
  } catch (err) {
    console.error('Browse listings error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single listing by id (public for buyer view)
router.get('/listings/:id', async (req, res) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, status: 'active' })
      .populate('sellerId', 'name phone email location')
      .lean();
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    const sellerRating = await getSellerRatingSummary(listing.sellerId?._id || listing.sellerId);
    res.json({ listing: { ...listing, sellerRating } });
  } catch (err) {
    console.error('Get listing error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Buyer: submit review for delivered order/listing
router.post('/listings/:id/reviews', authenticateBuyerToken, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().isString().isLength({ max: 400 }).withMessage('Comment too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const listing = await Listing.findById(req.params.id).lean();
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    const deliveredOrder = await Order.findOne({
      listingId: listing._id,
      buyerId: req.buyer.buyerId,
      status: 'delivered'
    });
    if (!deliveredOrder) {
      return res.status(403).json({ message: 'Review allowed only after delivered order' });
    }

    const review = await Review.findOneAndUpdate(
      { listingId: listing._id, buyerId: req.buyer.buyerId },
      {
        $set: {
          sellerId: listing.sellerId,
          rating: req.body.rating,
          comment: (req.body.comment || '').trim()
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const [buyer, seller] = await Promise.all([
      Buyer.findById(req.buyer.buyerId).select('name email phone').lean(),
      User.findById(listing.sellerId).select('name email phone').lean()
    ]);

    await Promise.all([
      sendCommerceAlert(
        seller,
        'New Rating Received',
        `You received a ${req.body.rating}/5 rating for ${listing.cropName}. Comment: ${(req.body.comment || 'No comment').trim() || 'No comment'}.`
      ),
      sendCommerceAlert(
        buyer,
        'Rating Submitted',
        `Your ${req.body.rating}/5 rating for ${listing.cropName} has been submitted successfully.`
      )
    ]);

    const sellerRating = await getSellerRatingSummary(listing.sellerId);
    res.status(201).json({ review, sellerRating });
  } catch (err) {
    console.error('Create review error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Public: get reviews for listing
router.get('/listings/:id/reviews', async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).select('_id sellerId').lean();
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    const reviews = await Review.find({ listingId: listing._id })
      .populate('buyerId', 'name')
      .sort({ createdAt: -1 })
      .lean();
    const sellerRating = await getSellerRatingSummary(listing.sellerId);

    res.json({
      reviews: reviews.map((r) => ({
        id: r._id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        buyerName: r.buyerId?.name || 'Buyer'
      })),
      sellerRating
    });
  } catch (err) {
    console.error('Get reviews error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
