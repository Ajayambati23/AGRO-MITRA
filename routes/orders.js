const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Listing = require('../models/Listing');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Buyer = require('../models/Buyer');
const NotificationService = require('../services/notificationService');

const router = express.Router();
const notificationService = new NotificationService();

async function sendCommerceAlert(contact, alert) {
  if (!contact || (!contact.email && !contact.phone)) {
    console.warn('Commerce alert skipped: missing contact channel');
    return { success: false, error: 'Missing contact channel' };
  }
  try {
    return await notificationService.sendFarmerAlert(
      contact,
      alert,
      'english'
    );
  } catch (error) {
    console.error('Commerce alert error:', error.message);
    return { success: false, error: error.message };
  }
}

function buyerAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });
  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, payload) => {
    if (err || !payload?.buyerId) return res.status(403).json({ message: 'Invalid or expired buyer token' });
    req.buyerId = payload.buyerId;
    next();
  });
}

function farmerAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });
  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, payload) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.userId = payload.userId;
    next();
  });
}

// Buyer: create order (proceed to buy)
router.post('/', buyerAuth, [
  body('listingId').isMongoId().withMessage('Valid listing ID required'),
  body('quantity').isFloat({ min: 0.1 }).withMessage('Valid quantity required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { listingId, quantity } = req.body;
    const requestedQty = Number(quantity);

    // Atomically reserve quantity so stock reflects immediately after buyer purchase.
    const listing = await Listing.findOneAndUpdate(
      { _id: listingId, status: 'active', quantity: { $gte: requestedQty } },
      [
        { $set: { quantity: { $subtract: ['$quantity', requestedQty] } } },
        { $set: { status: { $cond: [{ $lte: ['$quantity', 0] }, 'sold', 'active'] } } }
      ],
      { new: true }
    );
    if (!listing) {
      return res.status(400).json({ message: 'Listing unavailable or insufficient quantity' });
    }

    const order = new Order({
      buyerId: req.buyerId,
      listingId,
      quantity: requestedQty,
      status: 'pending',
    });
    try {
      await order.save();
    } catch (saveError) {
      // Best-effort rollback if order creation fails after stock reservation.
      await Listing.findByIdAndUpdate(listingId, {
        $inc: { quantity: requestedQty },
        $set: { status: 'active' }
      });
      throw saveError;
    }

    const [buyer, seller] = await Promise.all([
      Buyer.findById(req.buyerId).select('name phone email').lean(),
      User.findById(listing.sellerId).select('name phone email').lean()
    ]);

    const sellerContact = seller || {
      name: 'Farmer',
      email: listing.contactEmail || '',
      phone: listing.contactPhone || ''
    };

    const qtyText = `${requestedQty} ${listing.unit}`;
    const unitPrice = Number(listing.pricePerUnit || 0);
    const totalAmount = requestedQty * unitPrice;
    const buyerName = buyer?.name || 'Buyer';
    const buyerPhone = buyer?.phone || 'N/A';
    const buyerEmail = buyer?.email || 'N/A';
    const orderTime = new Date(order.createdAt).toLocaleString();

    const sellerSms = `New order: ${listing.cropName}, ${qtyText}. Buyer: ${buyerName}, Phone: ${buyerPhone}. Order ID: ${order._id}`;
    const sellerEmail = `
      <h3>New Order Received</h3>
      <p>A buyer has purchased your product.</p>
      <ul>
        <li><strong>Order ID:</strong> ${order._id}</li>
        <li><strong>Crop:</strong> ${listing.cropName}</li>
        <li><strong>Quantity:</strong> ${qtyText}</li>
        <li><strong>Price Per Unit:</strong> ${unitPrice}</li>
        <li><strong>Total Amount:</strong> ${totalAmount}</li>
        <li><strong>Buyer Name:</strong> ${buyerName}</li>
        <li><strong>Buyer Phone:</strong> ${buyerPhone}</li>
        <li><strong>Buyer Email:</strong> ${buyerEmail}</li>
        <li><strong>Time:</strong> ${orderTime}</li>
      </ul>
      <p>Please review and update order status in seller dashboard.</p>
    `;

    const [sellerAlert, buyerAlert] = await Promise.all([
      sendCommerceAlert(sellerContact, {
        subject: 'New Order Received',
        message: sellerSms,
        smsMessage: sellerSms,
        emailMessage: sellerEmail,
        channel: 'both'
      }),
      sendCommerceAlert(buyer, {
        subject: 'Order Placed Successfully',
        message: `Your order for ${listing.cropName} (${qtyText}) has been placed and is pending seller confirmation.`,
        channel: 'both'
      })
    ]);

    const populated = await Order.findById(order._id)
      .populate('buyerId', 'name email phone address')
      .populate('listingId');
    res.status(201).json({
      order: populated,
      notificationStatus: {
        seller: sellerAlert,
        buyer: buyerAlert
      }
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Buyer: my orders (with seller/farmer details for contact after purchase)
router.get('/my', buyerAuth, async (req, res) => {
  try {
    const orders = await Order.find({ buyerId: req.buyerId })
      .populate({ path: 'listingId', populate: { path: 'sellerId', select: 'name phone email' } })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ orders });
  } catch (err) {
    console.error('My orders error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Farmer: orders for my listings (with buyer details)
router.get('/for-seller', farmerAuth, async (req, res) => {
  try {
    const myListings = await Listing.find({ sellerId: req.userId }).select('_id');
    const listingIds = myListings.map((l) => l._id);
    const orders = await Order.find({ listingId: { $in: listingIds }, status: { $in: ['pending', 'accepted', 'confirmed', 'delivered', 'rejected'] } })
      .populate('buyerId', 'name email phone address')
      .populate('listingId')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ orders });
  } catch (err) {
    console.error('For-seller orders error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Farmer: update order status (accepted / delivered / rejected)
// Support both PATCH and PUT so clients/proxies that don't support PATCH still work
const updateStatusHandler = [
  farmerAuth,
  [
    body('status').isIn(['accepted', 'delivered', 'rejected']).withMessage('Status must be accepted, delivered, or rejected'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { id } = req.params;
      const { status } = req.body;
      const order = await Order.findById(id).populate('listingId');
      if (!order) return res.status(404).json({ message: 'Order not found' });
      const listing = order.listingId;
      if (!listing) return res.status(403).json({ message: 'Order listing not found' });
      const sellerIdRaw = listing.sellerId;
      const sellerIdStr = sellerIdRaw ? (sellerIdRaw._id ? String(sellerIdRaw._id) : String(sellerIdRaw)) : '';
      if (sellerIdStr !== String(req.userId)) {
        return res.status(403).json({ message: 'Not your order' });
      }
      const previousStatus = order.status;
      order.status = status;
      await order.save();

      // If seller rejects, release reserved stock back to listing.
      if (status === 'rejected' && previousStatus !== 'rejected') {
        await Listing.findByIdAndUpdate(listing._id, {
          $inc: { quantity: Number(order.quantity) },
          $set: { status: 'active' }
        });
      }

      const [buyer, seller] = await Promise.all([
        Buyer.findById(order.buyerId).select('name phone email').lean(),
        User.findById(req.userId).select('name phone email').lean()
      ]);
      const qtyText = `${order.quantity} ${listing.unit}`;
      const [buyerAlert, sellerAlert] = await Promise.all([
        sendCommerceAlert(buyer, {
          subject: `Order ${status.toUpperCase()}`,
          message: `Your order for ${listing.cropName} (${qtyText}) is now '${status}'.`,
          channel: 'both'
        }),
        sendCommerceAlert(seller, {
          subject: `Order Updated: ${status}`,
          message: `You marked order for ${listing.cropName} (${qtyText}) as '${status}'.`,
          channel: 'both'
        })
      ]);

      const populated = await Order.findById(order._id)
        .populate('buyerId', 'name email phone address')
        .populate('listingId')
        .lean();
      res.json({
        order: populated,
        notificationStatus: {
          buyer: buyerAlert,
          seller: sellerAlert
        }
      });
    } catch (err) {
      console.error('Update order status error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },
];
router.patch('/:id/status', updateStatusHandler);
router.put('/:id/status', updateStatusHandler);

module.exports = router;
module.exports.updateStatusHandler = updateStatusHandler;
module.exports.farmerAuth = farmerAuth;
