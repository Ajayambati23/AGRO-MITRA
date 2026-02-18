const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: String,
    required: true
  },
  messages: [{
    type: {
      type: String,
      enum: ['user', 'bot', 'system']
    },
    content: {
      text: String,
      audio: String,
      image: String,
      video: String
    },
    language: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    intent: String,
    entities: [{
      name: String,
      value: String,
      confidence: Number
    }],
    response: {
      type: String,
      enum: ['crop_recommendation', 'harvesting_guidance', 'pest_control', 'irrigation', 'fertilization', 'weather', 'market_price', 'general', 'calendar']
    }
  }],
  context: {
    currentCrop: String,
    season: String,
    soilType: String,
    location: String,
    lastActivity: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Chat', chatSchema);
