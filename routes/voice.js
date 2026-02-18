const express = require('express');
const multer = require('multer');
const VoiceProcessor = require('../utils/voiceProcessor');
const { getTranslation } = require('../utils/translations');

const router = express.Router();

// Configure multer for audio file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const voiceProcessor = new VoiceProcessor();
    if (voiceProcessor.isValidAudioFormat(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format. Supported formats: wav, mp3, ogg, webm'), false);
    }
  }
});

const voiceProcessor = new VoiceProcessor();

// Convert speech to text
router.post('/speech-to-text', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Audio file is required' });
    }

    const { language = 'english' } = req.body;
    const audioBuffer = req.file.buffer;

    const result = await voiceProcessor.speechToText(audioBuffer, language);

    res.json(result);
  } catch (error) {
    console.error('Speech to text error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error processing speech to text' 
    });
  }
});

// Convert text to speech
router.post('/text-to-speech', async (req, res) => {
  try {
    const { text, language = 'english', voice = 'default' } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'Text is required' });
    }

    const result = await voiceProcessor.textToSpeech(text, language, voice);

    res.json(result);
  } catch (error) {
    console.error('Text to speech error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error processing text to speech' 
    });
  }
});

// Process voice input for agricultural queries
router.post('/process-voice', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Audio file is required' });
    }

    const { language = 'english' } = req.body;
    const audioBuffer = req.file.buffer;

    const result = await voiceProcessor.processVoiceInput(audioBuffer, language);

    res.json(result);
  } catch (error) {
    console.error('Voice processing error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error processing voice input' 
    });
  }
});

// Generate voice response for agricultural guidance
router.post('/generate-response', async (req, res) => {
  try {
    const { responseType, data, language = 'english' } = req.body;

    if (!responseType) {
      return res.status(400).json({ message: 'Response type is required' });
    }

    const result = await voiceProcessor.generateVoiceResponse(responseType, data, language);

    res.json(result);
  } catch (error) {
    console.error('Voice response generation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error generating voice response' 
    });
  }
});

// Get supported languages
router.get('/languages', (req, res) => {
  try {
    const languages = voiceProcessor.getSupportedLanguages();
    res.json({ languages });
  } catch (error) {
    console.error('Get languages error:', error);
    res.status(500).json({ message: 'Error fetching supported languages' });
  }
});

// Get audio formats
router.get('/formats', (req, res) => {
  try {
    const formats = voiceProcessor.audioFormats;
    res.json({ formats });
  } catch (error) {
    console.error('Get formats error:', error);
    res.status(500).json({ message: 'Error fetching audio formats' });
  }
});

// Test voice functionality
router.post('/test', async (req, res) => {
  try {
    const { language = 'english' } = req.body;
    
    const testText = getTranslation('welcome', language);
    const result = await voiceProcessor.textToSpeech(testText, language);

    res.json({
      success: true,
      message: 'Voice test completed',
      testText: testText,
      audioUrl: result.audioUrl,
      language: language
    });
  } catch (error) {
    console.error('Voice test error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error testing voice functionality' 
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
    }
  }
  
  if (error.message.includes('Invalid audio format')) {
    return res.status(400).json({ message: error.message });
  }
  
  console.error('Voice route error:', error);
  res.status(500).json({ message: 'Internal server error' });
});

module.exports = router;
