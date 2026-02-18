const express = require('express');
const { body, validationResult } = require('express-validator');
const Calendar = require('../models/Calendar');
const Crop = require('../models/Crop');
const User = require('../models/User');
const cron = require('node-cron');
const { getTranslation } = require('../utils/translations');

const router = express.Router();

// Optional OpenAI for AI-suggested maturity period (days from planting to harvest)
const OpenAI = require('openai');
const openaiClient = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

/** Get maturity period in days: use crop data, optionally refine with AI */
async function getMaturityPeriodDays(crop) {
  const fromDb = crop.harvesting?.maturityPeriod;
  if (fromDb && fromDb > 0) return fromDb;

  if (!openaiClient) return 120; // default fallback

  try {
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an agricultural expert for Indian crops. Reply with a single integer only: typical days from planting to harvest.'
        },
        {
          role: 'user',
          content: `For ${crop.name} (${crop.scientificName || 'common crop'}) in India, how many days from planting to harvest? Single number only.`
        }
      ],
      max_tokens: 10,
      temperature: 0.3
    });
    const text = completion.choices?.[0]?.message?.content?.trim();
    const num = parseInt(String(text).replace(/\D/g, ''), 10);
    if (num > 0 && num < 400) return num;
  } catch (e) {
    console.warn('AI maturity period lookup failed:', e.message);
  }
  return 120;
}

/** Parse "X days" or "X-Y days after planting" from timing string; return approximate day offset */
function parseDaysFromTiming(timing) {
  if (!timing || typeof timing !== 'string') return null;
  const match = timing.match(/(\d+)\s*-\s*(\d+)\s*days?/i) || timing.match(/(\d+)\s*days?/i);
  if (match) {
    const a = parseInt(match[1], 10);
    const b = match[2] ? parseInt(match[2], 10) : a;
    return Math.round((a + b) / 2);
  }
  if (/\b(at\s+)?planting\b/i.test(timing)) return 0;
  return null;
}

/** Infer irrigation interval in days from frequency string (e.g. "Every 3-4 days" -> 3) */
function getIrrigationIntervalDays(crop) {
  const freq = crop.irrigation?.frequency || '';
  const match = freq.match(/(\d+)\s*-\s*(\d+)\s*days?/i) || freq.match(/(\d+)\s*days?/i);
  if (match) return Math.max(1, parseInt(match[1], 10));
  if (/weekly|every\s+7/i.test(freq)) return 7;
  if (/daily/i.test(freq)) return 1;
  return 5; // default
}

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Create calendar for a crop
router.post('/', authenticateToken, [
  body('cropId').isMongoId().withMessage('Valid crop ID is required'),
  body('plantingDate').isISO8601().withMessage('Valid planting date is required'),
  body('language').optional().isIn(['hindi', 'telugu', 'english', 'kannada', 'tamil', 'malayalam'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { cropId, plantingDate, language = 'english' } = req.body;
    const userId = req.user.userId;

    // Get crop details
    const crop = await Crop.findById(cropId);
    if (!crop) {
      return res.status(404).json({ message: 'Crop not found' });
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate activities based on crop (crop-specific duration; AI can suggest maturity if needed)
    const activities = await generateCropActivities(crop, new Date(plantingDate), language);

    // Create calendar
    const calendar = new Calendar({
      user: userId,
      crop: cropId,
      plantingDate: new Date(plantingDate),
      activities: activities,
      notifications: []
    });

    await calendar.save();

    const maturityDays = await getMaturityPeriodDays(crop);
    res.status(201).json({
      message: getTranslation('calendar', language),
      calendar: {
        id: calendar._id,
        crop: crop.localNames[language] || crop.name,
        plantingDate: calendar.plantingDate,
        maturityPeriodDays: maturityDays,
        activities: calendar.activities,
        notifications: calendar.notifications
      }
    });
  } catch (error) {
    console.error('Create calendar error:', error);
    res.status(500).json({ message: 'Error creating calendar' });
  }
});

// Get user's calendars
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { language = 'english' } = req.query;

    const calendars = await Calendar.find({ 
      user: userId, 
      isActive: true 
    })
    .populate('crop', 'name localNames harvesting')
    .sort({ plantingDate: -1 });

    const formattedCalendars = calendars.map(calendar => ({
      id: calendar._id,
      crop: calendar.crop.localNames?.[language] || calendar.crop.name,
      plantingDate: calendar.plantingDate,
      maturityPeriodDays: calendar.crop.harvesting?.maturityPeriod ?? 120,
      activities: calendar.activities,
      notifications: calendar.notifications,
      createdAt: calendar.createdAt
    }));

    res.json({ calendars: formattedCalendars });
  } catch (error) {
    console.error('Get calendars error:', error);
    res.status(500).json({ message: 'Error fetching calendars' });
  }
});

// Get calendar by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { language = 'english' } = req.query;
    const userId = req.user.userId;

    const calendar = await Calendar.findOne({ 
      _id: id, 
      user: userId, 
      isActive: true 
    }).populate('crop', 'name localNames harvesting');

    if (!calendar) {
      return res.status(404).json({ message: 'Calendar not found' });
    }

    const formattedCalendar = {
      id: calendar._id,
      crop: calendar.crop.localNames?.[language] || calendar.crop.name,
      plantingDate: calendar.plantingDate,
      maturityPeriodDays: calendar.crop.harvesting?.maturityPeriod ?? 120,
      activities: calendar.activities,
      notifications: calendar.notifications,
      createdAt: calendar.createdAt
    };

    res.json({ calendar: formattedCalendar });
  } catch (error) {
    console.error('Get calendar error:', error);
    res.status(500).json({ message: 'Error fetching calendar' });
  }
});

// Update activity status
router.put('/:id/activities/:activityId', authenticateToken, [
  body('status').isIn(['pending', 'completed', 'overdue', 'cancelled']).withMessage('Invalid status'),
  body('completedDate').optional().isISO8601().withMessage('Invalid completed date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id, activityId } = req.params;
    const { status, completedDate } = req.body;
    const userId = req.user.userId;

    const calendar = await Calendar.findOne({ 
      _id: id, 
      user: userId, 
      isActive: true 
    });

    if (!calendar) {
      return res.status(404).json({ message: 'Calendar not found' });
    }

    const activity = calendar.activities.id(activityId);
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    activity.status = status;
    if (completedDate) {
      activity.completedDate = new Date(completedDate);
    }

    await calendar.save();

    res.json({ 
      message: 'Activity updated successfully',
      activity: activity
    });
  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({ message: 'Error updating activity' });
  }
});

// Delete a specific activity from calendar
router.delete('/:id/activities/:activityId', authenticateToken, async (req, res) => {
  try {
    const { id, activityId } = req.params;
    const userId = req.user.userId;

    const calendar = await Calendar.findOne({
      _id: id,
      user: userId,
      isActive: true
    });

    if (!calendar) {
      return res.status(404).json({ message: 'Calendar not found' });
    }

    const activity = calendar.activities.id(activityId);
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    activity.deleteOne();
    await calendar.save();

    res.json({
      message: 'Activity deleted successfully'
    });
  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({ message: 'Error deleting activity' });
  }
});

// Add custom activity
router.post('/:id/activities', authenticateToken, [
  body('type').isIn(['planting', 'irrigation', 'fertilization', 'pest_control', 'harvesting', 'pruning', 'weeding']).withMessage('Invalid activity type'),
  body('name').trim().isLength({ min: 1 }).withMessage('Activity name is required'),
  body('description').optional().isString(),
  body('scheduledDate').isISO8601().withMessage('Valid scheduled date is required'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { type, name, description, scheduledDate, priority = 'medium' } = req.body;
    const userId = req.user.userId;

    const calendar = await Calendar.findOne({ 
      _id: id, 
      user: userId, 
      isActive: true 
    });

    if (!calendar) {
      return res.status(404).json({ message: 'Calendar not found' });
    }

    const activity = {
      type,
      name,
      description,
      scheduledDate: new Date(scheduledDate),
      priority,
      status: 'pending',
      reminders: [],
      instructions: {
        text: description || '',
        audio: '',
        images: [],
        video: ''
      }
    };

    calendar.activities.push(activity);
    await calendar.save();

    res.status(201).json({
      message: 'Activity added successfully',
      activity: activity
    });
  } catch (error) {
    console.error('Add activity error:', error);
    res.status(500).json({ message: 'Error adding activity' });
  }
});

// Get upcoming activities
router.get('/upcoming/activities', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { days = 7, language = 'english' } = req.query;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + parseInt(days));

    const calendars = await Calendar.find({ 
      user: userId, 
      isActive: true 
    }).populate('crop', 'name localNames');

    const upcomingActivities = [];

    calendars.forEach(calendar => {
      calendar.activities.forEach(activity => {
        if (activity.scheduledDate >= startDate && 
            activity.scheduledDate <= endDate && 
            activity.status === 'pending') {
          upcomingActivities.push({
            id: activity._id,
            calendarId: calendar._id,
            crop: calendar.crop.localNames[language] || calendar.crop.name,
            type: activity.type,
            name: activity.name,
            description: activity.description,
            scheduledDate: activity.scheduledDate,
            priority: activity.priority,
            status: activity.status
          });
        }
      });
    });

    // Sort by scheduled date
    upcomingActivities.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

    res.json({ 
      activities: upcomingActivities,
      period: `${days} days`,
      count: upcomingActivities.length
    });
  } catch (error) {
    console.error('Get upcoming activities error:', error);
    res.status(500).json({ message: 'Error fetching upcoming activities' });
  }
});

// Get overdue activities
router.get('/overdue/activities', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { language = 'english' } = req.query;

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const calendars = await Calendar.find({ 
      user: userId, 
      isActive: true 
    }).populate('crop', 'name localNames');

    const overdueActivities = [];

    calendars.forEach(calendar => {
      calendar.activities.forEach(activity => {
        if (activity.scheduledDate < today && activity.status === 'pending') {
          overdueActivities.push({
            id: activity._id,
            calendarId: calendar._id,
            crop: calendar.crop.localNames[language] || calendar.crop.name,
            type: activity.type,
            name: activity.name,
            description: activity.description,
            scheduledDate: activity.scheduledDate,
            priority: activity.priority,
            status: 'overdue',
            daysOverdue: Math.ceil((today - activity.scheduledDate) / (1000 * 60 * 60 * 24))
          });
        }
      });
    });

    // Sort by days overdue
    overdueActivities.sort((a, b) => b.daysOverdue - a.daysOverdue);

    res.json({ 
      activities: overdueActivities,
      count: overdueActivities.length
    });
  } catch (error) {
    console.error('Get overdue activities error:', error);
    res.status(500).json({ message: 'Error fetching overdue activities' });
  }
});

// Delete calendar
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const calendar = await Calendar.findOneAndUpdate(
      { _id: id, user: userId },
      { isActive: false },
      { new: true }
    );

    if (!calendar) {
      return res.status(404).json({ message: 'Calendar not found' });
    }

    res.json({ message: 'Calendar deleted successfully' });
  } catch (error) {
    console.error('Delete calendar error:', error);
    res.status(500).json({ message: 'Error deleting calendar' });
  }
});

// Generate crop-specific activities using maturity period (from DB or AI)
async function generateCropActivities(crop, plantingDate, language) {
  const activities = [];
  const planting = new Date(plantingDate);
  const maturityDays = await getMaturityPeriodDays(crop);
  const irrigationInterval = getIrrigationIntervalDays(crop);

  // Planting activity
  activities.push({
    type: 'planting',
    name: getTranslation('planting', language),
    description: `Plant ${crop.name} seeds`,
    scheduledDate: new Date(planting),
    status: 'pending',
    priority: 'high',
    reminders: [],
    instructions: {
      text: crop.planting?.plantingTime || '',
      audio: '',
      images: [],
      video: ''
    }
  });

  // Irrigation: spread over full growth period at crop-specific interval
  const lastIrrigationDay = Math.max(maturityDays - 14, 7);
  for (let d = irrigationInterval; d <= lastIrrigationDay; d += irrigationInterval) {
    const irrigationDate = new Date(planting);
    irrigationDate.setDate(irrigationDate.getDate() + d);
    activities.push({
      type: 'irrigation',
      name: getTranslation('irrigation', language),
      description: `Water the ${crop.name} plants`,
      scheduledDate: irrigationDate,
      status: 'pending',
      priority: 'medium',
      reminders: [],
      instructions: {
        text: crop.irrigation?.frequency || '',
        audio: '',
        images: [],
        video: ''
      }
    });
  }

  // Fertilization: use schedule timing (e.g. "25-30 days" -> day 27) or spread evenly
  const schedule = crop.fertilization?.schedule || [];
  schedule.forEach((s, index) => {
    const dayOffset = parseDaysFromTiming(s.timing) ?? (index + 1) * Math.max(15, Math.floor(maturityDays / (schedule.length + 1)));
    const fertDate = new Date(planting);
    fertDate.setDate(fertDate.getDate() + dayOffset);
    if (dayOffset <= maturityDays) {
      activities.push({
        type: 'fertilization',
        name: getTranslation('fertilization', language),
        description: `${s.fertilizer} - ${s.stage}`,
        scheduledDate: fertDate,
        status: 'pending',
        priority: 'medium',
        reminders: [],
        instructions: {
          text: `${s.fertilizer}: ${s.quantity} - ${s.timing}`,
          audio: '',
          images: [],
          video: ''
        }
      });
    }
  });

  // Pest control: every 3 weeks, max 5 checks (avoids cluttering calendar)
  const PEST_INTERVAL_DAYS = 21;
  const MAX_PEST_CHECKS = 5;
  let pestCount = 0;
  for (let d = PEST_INTERVAL_DAYS; d < maturityDays && pestCount < MAX_PEST_CHECKS; d += PEST_INTERVAL_DAYS) {
    pestCount++;
    const pestDate = new Date(planting);
    pestDate.setDate(pestDate.getDate() + d);
    activities.push({
      type: 'pest_control',
      name: getTranslation('pestControl', language),
      description: `Check for pests and diseases in ${crop.name}`,
      scheduledDate: pestDate,
      status: 'pending',
      priority: 'high',
      reminders: [],
      instructions: {
        text: (crop.pestControl?.commonPests || []).join(', ') || 'Routine check',
        audio: '',
        images: [],
        video: ''
      }
    });
  }

  // Harvesting: crop-specific maturity period
  const harvestDate = new Date(planting);
  harvestDate.setDate(harvestDate.getDate() + maturityDays);
  activities.push({
    type: 'harvesting',
    name: getTranslation('harvesting', language),
    description: `Harvest ${crop.name}`,
    scheduledDate: harvestDate,
    status: 'pending',
    priority: 'critical',
    reminders: [],
    instructions: {
      text: crop.harvesting?.method || '',
      audio: '',
      images: [],
      video: ''
    }
  });

  return activities;
}

module.exports = router;
