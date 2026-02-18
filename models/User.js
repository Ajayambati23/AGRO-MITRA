const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  preferredLanguage: {
    type: String,
    enum: ['hindi', 'telugu', 'english', 'kannada', 'tamil', 'malayalam'],
    default: 'english'
  },
  location: {
    state: String,
    district: String,
    village: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  soilType: {
    type: String,
    enum: ['black', 'red', 'laterite', 'alluvial', 'mountain', 'saline', 'desert', 'clay', 'sandy', 'loamy', 'silty', 'peaty', 'chalky']
  },
  farmSize: {
    type: Number, // in acres
    default: 0
  },
  experience: {
    type: String,
    enum: ['beginner', 'intermediate', 'expert'],
    default: 'beginner'
  },
  crops: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Crop'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
