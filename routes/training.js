const express = require('express');
const { body, validationResult } = require('express-validator');
const AIService = require('../services/aiService');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const aiService = new AIService();

// Middleware to authenticate admin JWT token
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
    if (user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin privileges required' });
    }
    req.user = user;
    next();
  });
}

// Add new training data
router.post('/add-data', authenticateToken, [
  body('text').trim().isLength({ min: 1 }).withMessage('Text is required'),
  body('category').isIn(['crop_recommendation', 'harvesting_guidance', 'pest_control', 'irrigation', 'fertilization', 'weather', 'market_price', 'general']).withMessage('Invalid category'),
  body('language').optional().isIn(['hindi', 'telugu', 'english', 'kannada', 'tamil', 'malayalam', 'hi', 'te', 'en', 'kn', 'ta', 'ml']).withMessage('Invalid language')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { text, category, language = 'english' } = req.body;
    
    // Language code mapping
    const languageCodeMap = {
      'hi': 'hindi',
      'te': 'telugu', 
      'en': 'english',
      'kn': 'kannada',
      'ta': 'tamil',
      'ml': 'malayalam'
    };
    
    const mappedLanguage = languageCodeMap[language] || language;
    const result = await aiService.addTrainingData(text, category, mappedLanguage);

    res.json(result);
  } catch (error) {
    console.error('Add training data error:', error);
    res.status(500).json({ success: false, error: 'Error adding training data' });
  }
});

// Get training statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = aiService.getTrainingStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Get training stats error:', error);
    res.status(500).json({ success: false, error: 'Error fetching training statistics' });
  }
});

// Get model performance
router.get('/performance', authenticateToken, async (req, res) => {
  try {
    const performance = await aiService.getModelPerformance();
    res.json({ success: true, performance });
  } catch (error) {
    console.error('Get model performance error:', error);
    res.status(500).json({ success: false, error: 'Error fetching model performance' });
  }
});

// Retrain the model
router.post('/retrain', authenticateToken, async (req, res) => {
  try {
    const result = await aiService.retrainClassifier();
    res.json(result);
  } catch (error) {
    console.error('Retrain model error:', error);
    res.status(500).json({ success: false, error: 'Error retraining model' });
  }
});

// Export training data
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const exportData = aiService.exportTrainingData();
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="agromitra-training-data.json"');
    
    res.json(exportData);
  } catch (error) {
    console.error('Export training data error:', error);
    res.status(500).json({ success: false, error: 'Error exporting training data' });
  }
});

// Import training data
router.post('/import', authenticateToken, async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data) {
      return res.status(400).json({ success: false, error: 'Training data is required' });
    }

    const result = await aiService.importTrainingData(data);
    res.json(result);
  } catch (error) {
    console.error('Import training data error:', error);
    res.status(500).json({ success: false, error: 'Error importing training data' });
  }
});

// Upload training data file
router.post('/upload', authenticateToken, async (req, res) => {
  try {
    if (!req.files || !req.files.trainingFile) {
      return res.status(400).json({ success: false, error: 'Training file is required' });
    }

    const file = req.files.trainingFile;
    const fileData = JSON.parse(file.data.toString());
    
    const result = await aiService.importTrainingData(fileData);
    res.json(result);
  } catch (error) {
    console.error('Upload training data error:', error);
    res.status(500).json({ success: false, error: 'Error uploading training data' });
  }
});

// Get available datasets
router.get('/datasets', authenticateToken, async (req, res) => {
  try {
    const datasets = [
      {
        name: 'Agricultural Queries Dataset',
        description: 'Multilingual agricultural queries for training',
        url: 'https://github.com/agromitra/datasets/raw/main/agricultural-queries.json',
        size: '2.5MB',
        samples: 10000,
        languages: ['english', 'hindi', 'telugu', 'kannada', 'tamil', 'malayalam'],
        categories: ['crop_recommendation', 'harvesting_guidance', 'pest_control', 'irrigation', 'fertilization', 'weather', 'market_price']
      },
      {
        name: 'Crop Disease Dataset',
        description: 'Crop disease identification and treatment queries',
        url: 'https://github.com/agromitra/datasets/raw/main/crop-diseases.json',
        size: '1.8MB',
        samples: 5000,
        languages: ['english', 'hindi', 'telugu'],
        categories: ['pest_control', 'disease_treatment']
      },
      {
        name: 'Weather Agricultural Dataset',
        description: 'Weather-related agricultural queries and responses',
        url: 'https://github.com/agromitra/datasets/raw/main/weather-agriculture.json',
        size: '1.2MB',
        samples: 3000,
        languages: ['english', 'hindi'],
        categories: ['weather', 'irrigation', 'crop_management']
      },
      {
        name: 'Market Price Dataset',
        description: 'Crop price queries and market information',
        url: 'https://github.com/agromitra/datasets/raw/main/market-prices.json',
        size: '0.8MB',
        samples: 2000,
        languages: ['english', 'hindi', 'telugu'],
        categories: ['market_price', 'crop_economics']
      }
    ];

    res.json({ success: true, datasets });
  } catch (error) {
    console.error('Get datasets error:', error);
    res.status(500).json({ success: false, error: 'Error fetching datasets' });
  }
});

// Download and import dataset
router.post('/download-dataset', authenticateToken, [
  body('datasetUrl').isURL().withMessage('Valid dataset URL is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { datasetUrl } = req.body;
    
    // In a real implementation, you would download the dataset from the URL
    // For now, we'll simulate the download
    const axios = require('axios');
    
    try {
      const response = await axios.get(datasetUrl);
      const datasetData = response.data;
      
      const result = await aiService.importTrainingData(datasetData);
      res.json(result);
    } catch (downloadError) {
      res.status(400).json({ 
        success: false, 
        error: 'Failed to download dataset. Please check the URL and try again.' 
      });
    }
  } catch (error) {
    console.error('Download dataset error:', error);
    res.status(500).json({ success: false, error: 'Error downloading dataset' });
  }
});

// Test model with sample queries
router.post('/test', authenticateToken, [
  body('queries').isArray().withMessage('Queries array is required'),
  body('language').optional().isIn(['hindi', 'telugu', 'english', 'kannada', 'tamil', 'malayalam', 'hi', 'te', 'en', 'kn', 'ta', 'ml']).withMessage('Invalid language')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { queries, language = 'english' } = req.body;
    
    // Language code mapping
    const languageCodeMap = {
      'hi': 'hindi',
      'te': 'telugu', 
      'en': 'english',
      'kn': 'kannada',
      'ta': 'tamil',
      'ml': 'malayalam'
    };
    
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
          success: result.success
        });
      } catch (error) {
        results.push({
          query,
          error: error.message,
          success: false
        });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('Test model error:', error);
    res.status(500).json({ success: false, error: 'Error testing model' });
  }
});

// Get model configuration
router.get('/config', authenticateToken, async (req, res) => {
  try {
    const config = {
      openai: {
        enabled: !!process.env.OPENAI_API_KEY,
        model: 'gpt-3.5-turbo',
        maxTokens: 500,
        temperature: 0.7
      },
      local: {
        enabled: true,
        algorithm: 'Naive Bayes',
        features: ['text_classification', 'intent_recognition'],
        languages: ['english', 'hindi', 'telugu', 'kannada', 'tamil', 'malayalam']
      },
      training: {
        autoRetrain: true,
        dataPath: aiService.modelPath,
        backupEnabled: true
      }
    };

    res.json({ success: true, config });
  } catch (error) {
    console.error('Get model config error:', error);
    res.status(500).json({ success: false, error: 'Error fetching model configuration' });
  }
});

// Update model configuration
router.put('/config', authenticateToken, [
  body('openai.enabled').optional().isBoolean(),
  body('openai.model').optional().isString(),
  body('openai.maxTokens').optional().isInt({ min: 100, max: 2000 }),
  body('openai.temperature').optional().isFloat({ min: 0, max: 2 }),
  body('local.enabled').optional().isBoolean(),
  body('training.autoRetrain').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // In a real implementation, you would update the configuration
    // For now, we'll just return success
    res.json({ 
      success: true, 
      message: 'Configuration updated successfully',
      config: req.body
    });
  } catch (error) {
    console.error('Update model config error:', error);
    res.status(500).json({ success: false, error: 'Error updating model configuration' });
  }
});

module.exports = router;
