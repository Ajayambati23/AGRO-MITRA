const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Order = require('../models/Order');
const Listing = require('../models/Listing');
const AIService = require('../services/aiService');

const router = express.Router();
const aiService = new AIService();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Admin access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired admin token' });
    }
    if (!payload || payload.role !== 'admin') {
      return res.status(403).json({ message: 'Admin privileges required' });
    }
    req.admin = payload;
    next();
  });
}

router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 1 }).withMessage('Password is required'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (email !== ADMIN_EMAIL.toLowerCase() || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: 'Invalid admin credentials' });
  }

  const token = jwt.sign(
    { role: 'admin', email: ADMIN_EMAIL },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  return res.json({
    message: 'Admin login successful',
    token,
    admin: {
      email: ADMIN_EMAIL,
      role: 'admin',
    },
  });
});

router.get('/me', authenticateAdmin, (req, res) => {
  res.json({
    admin: {
      email: req.admin.email,
      role: 'admin',
    },
  });
});

router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const search = String(req.query.search || '').trim();

    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Admin users fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

router.patch('/users/:id/status', authenticateAdmin, [
  body('isActive').isBoolean().withMessage('isActive must be boolean'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: req.body.isActive } },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: req.body.isActive ? 'User activated successfully' : 'User suspended successfully',
      user,
    });
  } catch (error) {
    console.error('Admin update user status error:', error);
    res.status(500).json({ message: 'Failed to update user status' });
  }
});

router.get('/summary', authenticateAdmin, async (req, res) => {
  try {
    const [usersTotal, usersActive, listingsTotal, listingsActive, listingsSold, ordersTotal, ordersByStatus] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isActive: true }),
      Listing.countDocuments({}),
      Listing.countDocuments({ status: 'active' }),
      Listing.countDocuments({ status: 'sold' }),
      Order.countDocuments({}),
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
    ]);

    const statusMap = ordersByStatus.reduce((acc, row) => {
      acc[row._id || 'unknown'] = row.count;
      return acc;
    }, {});

    res.json({
      users: {
        total: usersTotal,
        active: usersActive,
        inactive: Math.max(0, usersTotal - usersActive),
      },
      listings: {
        total: listingsTotal,
        active: listingsActive,
        sold: listingsSold,
      },
      orders: {
        total: ordersTotal,
        byStatus: statusMap,
      },
    });
  } catch (error) {
    console.error('Admin summary error:', error);
    res.status(500).json({ message: 'Failed to fetch summary' });
  }
});

router.get('/orders', authenticateAdmin, async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const status = String(req.query.status || '').trim();

    const query = {};
    if (status) query.status = status;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('buyerId', 'name email phone')
        .populate({
          path: 'listingId',
          populate: { path: 'sellerId', select: 'name email phone' }
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(query),
    ]);

    res.json({
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Admin orders fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

router.get('/training/stats', authenticateAdmin, (req, res) => {
  try {
    const stats = aiService.getTrainingStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Admin training stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch training stats' });
  }
});

router.get('/training/performance', authenticateAdmin, async (req, res) => {
  try {
    const performance = await aiService.getModelPerformance();
    res.json({ success: true, performance });
  } catch (error) {
    console.error('Admin training performance error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch model performance' });
  }
});

router.post('/training/retrain', authenticateAdmin, async (req, res) => {
  try {
    const result = await aiService.retrainClassifier();
    res.json(result);
  } catch (error) {
    console.error('Admin training retrain error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrain model' });
  }
});

router.post('/training/add-data', authenticateAdmin, [
  body('text').trim().isLength({ min: 1 }).withMessage('Text is required'),
  body('category')
    .isIn(['crop_recommendation', 'harvesting_guidance', 'pest_control', 'irrigation', 'fertilization', 'weather', 'market_price', 'general'])
    .withMessage('Invalid category'),
  body('language')
    .optional()
    .isIn(['hindi', 'telugu', 'english', 'kannada', 'tamil', 'malayalam', 'hi', 'te', 'en', 'kn', 'ta', 'ml'])
    .withMessage('Invalid language'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { text, category, language = 'english' } = req.body;
    const languageCodeMap = { hi: 'hindi', te: 'telugu', en: 'english', kn: 'kannada', ta: 'tamil', ml: 'malayalam' };
    const mappedLanguage = languageCodeMap[language] || language;
    const result = await aiService.addTrainingData(text, category, mappedLanguage);
    res.json(result);
  } catch (error) {
    console.error('Admin add training data error:', error);
    res.status(500).json({ success: false, error: 'Failed to add training data' });
  }
});

router.post('/training/test', authenticateAdmin, [
  body('queries').isArray().withMessage('Queries array is required'),
  body('language')
    .optional()
    .isIn(['hindi', 'telugu', 'english', 'kannada', 'tamil', 'malayalam', 'hi', 'te', 'en', 'kn', 'ta', 'ml'])
    .withMessage('Invalid language'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { queries, language = 'english' } = req.body;
    const languageCodeMap = { hi: 'hindi', te: 'telugu', en: 'english', kn: 'kannada', ta: 'tamil', ml: 'malayalam' };
    const mappedLanguage = languageCodeMap[language] || language;
    const results = [];

    for (const query of queries) {
      try {
        const result = await aiService.processQuery(query, { preferredLanguage: mappedLanguage }, mappedLanguage);
        results.push({
          query,
          prediction: result.classification,
          confidence: result.confidence,
          model: result.model,
          success: result.success,
        });
      } catch (error) {
        results.push({ query, error: error.message, success: false });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('Admin test model error:', error);
    res.status(500).json({ success: false, error: 'Failed to test model' });
  }
});

module.exports = router;
