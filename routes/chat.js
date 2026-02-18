const express = require('express');
const { body, validationResult } = require('express-validator');
const Chat = require('../models/Chat');
const User = require('../models/User');
const AIService = require('../services/aiService');
const VoiceProcessor = require('../utils/voiceProcessor');
const { getTranslation, detectLanguage } = require('../utils/translations');
const { recommendFromImage } = require('../services/diseaseRecommendationService');

const router = express.Router();
const aiService = new AIService();
const voiceProcessor = new VoiceProcessor();

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

// Send text message
router.post('/message', authenticateToken, [
  body('message').trim().isLength({ min: 1 }).withMessage('Message cannot be empty'),
  body('sessionId').optional().isString(),
  body('language').optional().isIn(['hindi', 'telugu', 'english', 'kannada', 'tamil', 'malayalam', 'hi', 'te', 'en', 'kn', 'ta', 'ml'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { message, sessionId, language } = req.body;
    const userId = req.user.userId;

    // Language code mapping
    const languageCodeMap = {
      'hi': 'hindi',
      'te': 'telugu', 
      'en': 'english',
      'kn': 'kannada',
      'ta': 'tamil',
      'ml': 'malayalam'
    };

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Detect language if not provided
    const detectedLanguage = detectLanguage(message);
    const mappedLanguage = languageCodeMap[language] || language;
    const queryLanguage = mappedLanguage || detectedLanguage || user.preferredLanguage;

    // Process the message with AI
    const aiResponse = await aiService.processQuery(message, user, queryLanguage);

    // Create or update chat session
    let chat = await Chat.findOne({ 
      user: userId, 
      sessionId: sessionId || 'default',
      isActive: true 
    });

    if (!chat) {
      chat = new Chat({
        user: userId,
        sessionId: sessionId || 'default',
        messages: [],
        context: {
          currentCrop: null,
          season: null,
          soilType: user.soilType,
          location: user.location?.state || 'Unknown',
          lastActivity: null
        }
      });
    }

    // Add user message
    chat.messages.push({
      type: 'user',
      content: { text: message },
      language: queryLanguage,
      timestamp: new Date()
    });

    // Add bot response
    chat.messages.push({
      type: 'bot',
      content: { text: aiResponse.response.message || aiResponse.response },
      language: queryLanguage,
      intent: aiResponse.classification,
      response: aiResponse.classification
    });

    // Update context
    if (aiResponse.response.crops) {
      chat.context.currentCrop = aiResponse.response.crops[0]?.name;
    }

    await chat.save();

    res.json({
      success: true,
      response: aiResponse.response,
      classification: aiResponse.classification,
      confidence: aiResponse.confidence,
      language: queryLanguage,
      sessionId: chat.sessionId,
      model: aiResponse.model || 'openai'
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error processing chat message' 
    });
  }
});

// Send plant disease image for pesticide recommendation
router.post('/disease-image', authenticateToken, [
  body('image').optional().isString().withMessage('Image should be base64 string'),
  body('message').optional().trim(),
  body('language').optional().isIn(['hindi', 'telugu', 'english', 'kannada', 'tamil', 'malayalam', 'hi', 'te', 'en', 'kn', 'ta', 'ml']),
], async (req, res) => {
  try {
    const { image, message: userMessage, language } = req.body;
    if (!image) {
      return res.status(400).json({ message: 'Please upload an image of the diseased plant' });
    }

    const userId = req.user.userId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const languageCodeMap = { hi: 'hindi', te: 'telugu', en: 'english', kn: 'kannada', ta: 'tamil', ml: 'malayalam' };
    const queryLanguage = languageCodeMap[language] || language || user.preferredLanguage || 'english';

    const { message, classification } = await recommendFromImage(image, userMessage, queryLanguage);

    res.json({
      success: true,
      response: { message },
      classification: classification || 'pest_control',
      language: queryLanguage,
    });
  } catch (error) {
    console.error('Disease image error:', error);
    res.status(500).json({ success: false, message: 'Error analyzing plant image' });
  }
});

// Send voice message
router.post('/voice', authenticateToken, async (req, res) => {
  try {
    const { audioData, language, sessionId } = req.body;
    const userId = req.user.userId;

    if (!audioData) {
      return res.status(400).json({ message: 'Audio data is required' });
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const queryLanguage = language || user.preferredLanguage;

    // Process voice input
    const voiceResult = await voiceProcessor.processVoiceInput(
      Buffer.from(audioData, 'base64'), 
      queryLanguage
    );

    if (!voiceResult.success) {
      return res.status(400).json({ 
        success: false,
        message: 'Voice processing failed' 
      });
    }

    // Process the recognized text with AI
    const aiResponse = await aiService.processQuery(
      voiceResult.processedText.text, 
      user, 
      queryLanguage
    );

    // Generate voice response
    const voiceResponse = await voiceProcessor.generateVoiceResponse(
      aiResponse.classification,
      aiResponse.response,
      queryLanguage
    );

    // Create or update chat session
    let chat = await Chat.findOne({ 
      user: userId, 
      sessionId: sessionId || 'default',
      isActive: true 
    });

    if (!chat) {
      chat = new Chat({
        user: userId,
        sessionId: sessionId || 'default',
        messages: [],
        context: {
          currentCrop: null,
          season: null,
          soilType: user.soilType,
          location: user.location?.state || 'Unknown',
          lastActivity: null
        }
      });
    }

    // Add user voice message
    chat.messages.push({
      type: 'user',
      content: { 
        text: voiceResult.originalText,
        audio: audioData 
      },
      language: queryLanguage,
      timestamp: new Date()
    });

    // Add bot response
    chat.messages.push({
      type: 'bot',
      content: { 
        text: aiResponse.response.message || aiResponse.response,
        audio: voiceResponse.audioUrl 
      },
      language: queryLanguage,
      intent: aiResponse.classification,
      response: aiResponse.classification
    });

    await chat.save();

    res.json({
      success: true,
      response: aiResponse.response,
      voiceResponse: voiceResponse,
      classification: aiResponse.classification,
      confidence: aiResponse.confidence,
      language: queryLanguage,
      sessionId: chat.sessionId
    });
  } catch (error) {
    console.error('Voice chat error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error processing voice message' 
    });
  }
});

// Get chat history
router.get('/history/:sessionId?', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const sessionId = req.params.sessionId || 'default';

    const chat = await Chat.findOne({ 
      user: userId, 
      sessionId: sessionId,
      isActive: true 
    });

    if (!chat) {
      return res.json({ messages: [] });
    }

    res.json({ 
      messages: chat.messages,
      context: chat.context,
      sessionId: chat.sessionId
    });
  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({ message: 'Error fetching chat history' });
  }
});

// Get all chat sessions
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const chats = await Chat.find({ 
      user: userId, 
      isActive: true 
    }).select('sessionId context createdAt updatedAt').sort({ updatedAt: -1 });

    res.json({ sessions: chats });
  } catch (error) {
    console.error('Chat sessions error:', error);
    res.status(500).json({ message: 'Error fetching chat sessions' });
  }
});

// Clear chat session
router.delete('/session/:sessionId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const sessionId = req.params.sessionId;

    await Chat.findOneAndUpdate(
      { user: userId, sessionId: sessionId },
      { isActive: false }
    );

    res.json({ message: 'Chat session cleared successfully' });
  } catch (error) {
    console.error('Clear session error:', error);
    res.status(500).json({ message: 'Error clearing chat session' });
  }
});

// Get supported languages
router.get('/languages', (req, res) => {
  try {
    const languages = voiceProcessor.getSupportedLanguages();
    res.json({ languages });
  } catch (error) {
    console.error('Languages error:', error);
    res.status(500).json({ message: 'Error fetching supported languages' });
  }
});

// Get quick suggestions
router.get('/suggestions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { language } = req.query;

    const user = await User.findById(userId);
    const queryLanguage = language || user?.preferredLanguage || 'english';

    const suggestions = [
      getTranslation('cropRecommendation', queryLanguage),
      getTranslation('harvestingGuidance', queryLanguage),
      getTranslation('pestControl', queryLanguage),
      getTranslation('irrigation', queryLanguage),
      getTranslation('weather', queryLanguage),
      getTranslation('marketPrice', queryLanguage)
    ];

    res.json({ suggestions });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ message: 'Error fetching suggestions' });
  }
});

module.exports = router;
