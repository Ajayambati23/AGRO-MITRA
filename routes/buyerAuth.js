const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Buyer = require('../models/Buyer');

const router = express.Router();

router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').trim().notEmpty().withMessage('Phone number required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('address').optional().isObject(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { name, email, phone, password, address } = req.body;
    const existing = await Buyer.findOne({ $or: [{ email }, { phone }] });
    if (existing) {
      return res.status(400).json({ message: 'An account with this email or phone already exists' });
    }
    const buyer = new Buyer({ name, email, phone, password, address: address || {} });
    await buyer.save();
    const token = jwt.sign(
      { buyerId: buyer._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );
    res.status(201).json({
      message: 'Registered successfully',
      token,
      buyer: {
        id: buyer._id,
        name: buyer.name,
        email: buyer.email,
        phone: buyer.phone,
        address: buyer.address,
      },
    });
  } catch (err) {
    console.error('Buyer register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').exists().withMessage('Password required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, password } = req.body;
    const buyer = await Buyer.findOne({ email });
    if (!buyer) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const match = await buyer.comparePassword(password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { buyerId: buyer._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );
    res.json({
      message: 'Login successful',
      token,
      buyer: {
        id: buyer._id,
        name: buyer.name,
        email: buyer.email,
        phone: buyer.phone,
        address: buyer.address,
      },
    });
  } catch (err) {
    console.error('Buyer login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }
  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, payload) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.buyer = payload;
    next();
  });
}

router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const buyer = await Buyer.findById(req.buyer.buyerId).select('-password');
    if (!buyer) return res.status(404).json({ message: 'Buyer not found' });
    res.json({ buyer });
  } catch (err) {
    console.error('Buyer profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = { router };
