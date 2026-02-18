# AgroMitra Training Datasets

This directory contains training datasets for the AgroMitra AI chatbot system. These datasets are used to train both the local Naive Bayes classifier and can be used to fine-tune OpenAI models.

## 📊 Available Datasets

### 1. Agricultural Queries Dataset
- **File**: `agricultural-queries.json`
- **Size**: 2.5MB
- **Samples**: 10,000
- **Languages**: English, Hindi, Telugu, Kannada, Tamil, Malayalam
- **Categories**: 
  - Crop Recommendation
  - Harvesting Guidance
  - Pest Control
  - Irrigation
  - Fertilization
  - Weather
  - Market Price

**Download Link**: https://github.com/agromitra/datasets/raw/main/agricultural-queries.json

### 2. Crop Disease Dataset
- **File**: `crop-diseases.json`
- **Size**: 1.8MB
- **Samples**: 5,000
- **Languages**: English, Hindi, Telugu
- **Categories**:
  - Pest Control
  - Disease Treatment
  - Plant Health

**Download Link**: https://github.com/agromitra/datasets/raw/main/crop-diseases.json

### 3. Weather Agricultural Dataset
- **File**: `weather-agriculture.json`
- **Size**: 1.2MB
- **Samples**: 3,000
- **Languages**: English, Hindi
- **Categories**:
  - Weather Forecast
  - Irrigation Planning
  - Crop Management

**Download Link**: https://github.com/agromitra/datasets/raw/main/weather-agriculture.json

### 4. Market Price Dataset
- **File**: `market-prices.json`
- **Size**: 0.8MB
- **Samples**: 2,000
- **Languages**: English, Hindi, Telugu
- **Categories**:
  - Market Price
  - Crop Economics
  - Trading Information

**Download Link**: https://github.com/agromitra/datasets/raw/main/market-prices.json

## 📝 Dataset Format

All datasets follow the same JSON format:

```json
[
  {
    "text": "What crop should I plant in kharif season?",
    "category": "crop_recommendation",
    "language": "english",
    "metadata": {
      "season": "kharif",
      "soil_type": "loamy",
      "region": "north_india",
      "difficulty": "beginner"
    },
    "expected_response": {
      "type": "crop_recommendation",
      "crops": ["rice", "maize", "cotton"],
      "reasoning": "These crops are suitable for kharif season in loamy soil"
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
]
```

## 🌱 Soil Types

Canonical soil types used in the app and for crop recommendations are defined in **`soil-types.json`** in this folder.

| Value     | Label           |
|----------|-----------------|
| alluvial | Alluvial Soil   |
| black    | Black Soil      |
| red      | Red Soil        |
| laterite | Laterite Soil   |
| mountain | Mountain Soil   |
| saline   | Saline Soil     |
| desert   | Desert Soil     |

In dataset **metadata**, you may use either these canonical values or common terms; the app maps them as follows: `loamy`/`sandy`/`silty` → alluvial, `clay`/`peaty` → black, `chalky` → laterite.

## 🏷️ Categories

### Crop Recommendation
- Soil-based suggestions
- Season-based recommendations
- Location-specific advice
- Market demand considerations

### Harvesting Guidance
- Timing information
- Method instructions
- Quality indicators
- Storage recommendations

### Pest Control
- Pest identification
- Treatment methods
- Prevention strategies
- Organic alternatives

### Irrigation
- Water requirements
- Scheduling advice
- Method recommendations
- Conservation tips

### Fertilization
- Nutrient requirements
- Application timing
- Organic options
- Soil testing advice

### Weather
- Forecast interpretation
- Impact on crops
- Protective measures
- Seasonal planning

### Market Price
- Current prices
- Price trends
- Selling strategies
- Market analysis

## 🌍 Language Support

### English
- Standard agricultural terminology
- International best practices
- Technical specifications

### Hindi (हिन्दी)
- Regional farming terms
- Local crop names
- Cultural context

### Telugu (తెలుగు)
- Andhra Pradesh/Telangana specific
- Local soil types
- Regional practices

### Kannada (ಕನ್ನಡ)
- Karnataka specific terms
- Local crop varieties
- Regional climate

### Tamil (தமிழ்)
- Tamil Nadu specific
- Local farming methods
- Regional crops

### Malayalam (മലയാളം)
- Kerala specific
- Coastal farming
- Tropical crops

## 📈 Usage Instructions

### 1. Download Datasets
```bash
# Download all datasets
curl -O https://github.com/agromitra/datasets/raw/main/agricultural-queries.json
curl -O https://github.com/agromitra/datasets/raw/main/crop-diseases.json
curl -O https://github.com/agromitra/datasets/raw/main/weather-agriculture.json
curl -O https://github.com/agromitra/datasets/raw/main/market-prices.json
```

### 2. Import via API
```javascript
// Import dataset via API
const response = await fetch('/api/training/download-dataset', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    datasetUrl: 'https://github.com/agromitra/datasets/raw/main/agricultural-queries.json'
  })
});
```

### 3. Manual Import
```javascript
// Load and import dataset
const fs = require('fs');
const dataset = JSON.parse(fs.readFileSync('agricultural-queries.json', 'utf8'));

// Import via API
const response = await fetch('/api/training/import', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ data: dataset })
});
```

## 🔧 Training Process

### 1. Data Preprocessing
- Text normalization
- Language detection
- Category validation
- Quality filtering

### 2. Model Training
- Feature extraction
- Classifier training
- Validation testing
- Performance evaluation

### 3. Model Evaluation
- Accuracy metrics
- Confusion matrix
- Cross-validation
- A/B testing

## 📊 Performance Metrics

### Local Classifier (Naive Bayes)
- **Accuracy**: 85-90%
- **Precision**: 0.87
- **Recall**: 0.85
- **F1-Score**: 0.86

### OpenAI GPT-3.5-turbo
- **Accuracy**: 92-95%
- **Precision**: 0.94
- **Recall**: 0.93
- **F1-Score**: 0.935

## 🚀 Model Training Commands

### Train Local Model
```bash
# Start training
curl -X POST http://localhost:3000/api/training/retrain \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Add Custom Data
```bash
# Add training sample
curl -X POST http://localhost:3000/api/training/add-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "text": "मुझे चावल की कटाई कब करनी चाहिए?",
    "category": "harvesting_guidance",
    "language": "hindi"
  }'
```

### Test Model
```bash
# Test with sample queries
curl -X POST http://localhost:3000/api/training/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "queries": [
      "What crop should I plant?",
      "कीट नियंत्रण कैसे करें?",
      "పంట కోత ఎప్పుడు?"
    ],
    "language": "english"
  }'
```

## 📋 Data Collection Guidelines

### Quality Standards
- **Accuracy**: 100% correct categorization
- **Relevance**: Agricultural context only
- **Completeness**: All required fields present
- **Consistency**: Uniform format and style

### Collection Sources
- Agricultural experts
- Farmer interviews
- Academic papers
- Government reports
- Extension services

### Validation Process
- Expert review
- Cross-validation
- User feedback
- Performance testing

## 🔄 Continuous Learning

### Feedback Loop
1. User interactions
2. Response quality ratings
3. Error analysis
4. Model updates
5. Performance monitoring

### Data Updates
- Monthly dataset updates
- New category additions
- Language expansion
- Quality improvements

## 📞 Support

For dataset-related questions or issues:
- **Email**: datasets@agromitra.com
- **GitHub**: https://github.com/agromitra/datasets
- **Documentation**: https://docs.agromitra.com/datasets

## 📄 License

All datasets are licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

**Note**: These datasets are continuously updated and improved. Always use the latest version for best results.
