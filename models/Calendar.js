const mongoose = require('mongoose');

const calendarSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  crop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Crop',
    required: true
  },
  plantingDate: {
    type: Date,
    required: true
  },
  activities: [{
    type: {
      type: String,
      enum: ['planting', 'irrigation', 'fertilization', 'pest_control', 'harvesting', 'pruning', 'weeding']
    },
    name: String,
    description: String,
    scheduledDate: Date,
    completedDate: Date,
    status: {
      type: String,
      enum: ['pending', 'completed', 'overdue', 'cancelled'],
      default: 'pending'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    reminders: [{
      type: {
        type: String,
        enum: ['sms', 'email', 'push', 'voice']
      },
      scheduledTime: Date,
      sent: {
        type: Boolean,
        default: false
      },
      message: String
    }],
    instructions: {
      text: String,
      audio: String,
      images: [String],
      video: String
    }
  }],
  notifications: [{
    type: {
      type: String,
      enum: ['weather_alert', 'pest_alert', 'harvest_ready', 'irrigation_due', 'fertilizer_due']
    },
    title: String,
    message: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    sent: {
      type: Boolean,
      default: false
    },
    scheduledTime: Date,
    language: String
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Calendar', calendarSchema);
