const axios = require('axios');
const fs = require('fs');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_ACCOUNTS = [];

class AgroMitraTestSuite {
  constructor() {
    this.baseURL = BASE_URL;
    this.authToken = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }

  async runTest(testName, testFunction) {
    try {
      console.log(`\n🧪 Running test: ${testName}`);
      await testFunction();
      this.testResults.passed++;
      this.testResults.details.push({ test: testName, status: 'PASSED', error: null });
      console.log(`✅ ${testName} - PASSED`);
    } catch (error) {
      this.testResults.failed++;
      this.testResults.details.push({ test: testName, status: 'FAILED', error: error.message });
      console.log(`❌ ${testName} - FAILED: ${error.message}`);
    }
    this.testResults.total++;
  }

  async testServerHealth() {
    const response = await axios.get(`${this.baseURL}/api/health`);
    if (response.status !== 200) {
      throw new Error('Health check failed');
    }
    console.log('   Server is running and healthy');
  }

  async testUserRegistration() {
    const timestamp = Date.now();
    const userData = {
      name: 'Test Farmer',
      email: `testfarmer${timestamp}@agromitra.com`,
      phone: `+9198765432${timestamp.toString().slice(-2)}`,
      password: 'testpassword123',
      preferredLanguage: 'hindi',
      location: {
        state: 'Uttar Pradesh',
        district: 'Lucknow',
        village: 'Test Village'
      },
      soilType: 'loamy',
      farmSize: 5,
      experience: 'intermediate'
    };

    const response = await axios.post(`${this.baseURL}/api/auth/register`, userData);
    
    if (response.status !== 201 || !response.data.token) {
      throw new Error('User registration failed');
    }

    this.authToken = response.data.token;
    TEST_ACCOUNTS.push({
      email: userData.email,
      password: userData.password,
      token: this.authToken,
      user: response.data.user
    });

    console.log('   User registered successfully');
    console.log(`   Token: ${this.authToken.substring(0, 20)}...`);
  }

  async testUserLogin() {
    const loginData = {
      email: 'testfarmer@agromitra.com',
      password: 'testpassword123'
    };

    const response = await axios.post(`${this.baseURL}/api/auth/login`, loginData);
    
    if (response.status !== 200 || !response.data.token) {
      throw new Error('User login failed');
    }

    this.authToken = response.data.token;
    console.log('   User logged in successfully');
  }

  async testGetUserProfile() {
    const response = await axios.get(`${this.baseURL}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${this.authToken}` }
    });

    if (response.status !== 200 || !response.data.user) {
      throw new Error('Get user profile failed');
    }

    console.log('   User profile retrieved successfully');
    console.log(`   User: ${response.data.user.name} (${response.data.user.email})`);
  }

  async testGetCrops() {
    const response = await axios.get(`${this.baseURL}/api/crops`);

    if (response.status !== 200 || !response.data.crops) {
      throw new Error('Get crops failed');
    }

    console.log(`   Retrieved ${response.data.crops.length} crops`);
    console.log(`   Sample crops: ${response.data.crops.slice(0, 3).map(c => c.name).join(', ')}`);
  }

  async testCropRecommendation() {
    const recommendationData = {
      season: 'kharif',
      soilType: 'loamy',
      location: 'Uttar Pradesh',
      language: 'hindi'
    };

    const response = await axios.post(`${this.baseURL}/api/crops/recommend`, recommendationData);

    if (response.status !== 200 || !response.data.crops) {
      throw new Error('Crop recommendation failed');
    }

    console.log(`   Got ${response.data.crops.length} crop recommendations`);
    console.log(`   Recommended crops: ${response.data.crops.map(c => c.name).join(', ')}`);
  }

  async testGetSpecificCrop() {
    // First get crops to get an ID
    const cropsResponse = await axios.get(`${this.baseURL}/api/crops`);
    const cropId = cropsResponse.data.crops[0].id;

    const response = await axios.get(`${this.baseURL}/api/crops/${cropId}`);

    if (response.status !== 200 || !response.data.crop) {
      throw new Error('Get specific crop failed');
    }

    console.log(`   Retrieved crop details for: ${response.data.crop.name}`);
  }

  async testCropHarvestingGuidance() {
    const cropsResponse = await axios.get(`${this.baseURL}/api/crops`);
    const cropId = cropsResponse.data.crops[0].id;

    const response = await axios.get(`${this.baseURL}/api/crops/${cropId}/harvesting?language=hindi`);

    if (response.status !== 200 || !response.data.guidance) {
      throw new Error('Harvesting guidance failed');
    }

    console.log(`   Retrieved harvesting guidance for: ${response.data.guidance.crop}`);
  }

  async testCropPestControl() {
    const cropsResponse = await axios.get(`${this.baseURL}/api/crops`);
    const cropId = cropsResponse.data.crops[0].id;

    const response = await axios.get(`${this.baseURL}/api/crops/${cropId}/pest-control?language=hindi`);

    if (response.status !== 200 || !response.data.pestControl) {
      throw new Error('Pest control information failed');
    }

    console.log(`   Retrieved pest control info for: ${response.data.pestControl.crop}`);
  }

  async testCropIrrigation() {
    const cropsResponse = await axios.get(`${this.baseURL}/api/crops`);
    const cropId = cropsResponse.data.crops[0].id;

    const response = await axios.get(`${this.baseURL}/api/crops/${cropId}/irrigation?language=hindi`);

    if (response.status !== 200 || !response.data.irrigation) {
      throw new Error('Irrigation guidance failed');
    }

    console.log(`   Retrieved irrigation info for: ${response.data.irrigation.crop}`);
  }

  async testCropFertilization() {
    const cropsResponse = await axios.get(`${this.baseURL}/api/crops`);
    const cropId = cropsResponse.data.crops[0].id;

    const response = await axios.get(`${this.baseURL}/api/crops/${cropId}/fertilization?language=hindi`);

    if (response.status !== 200 || !response.data.fertilization) {
      throw new Error('Fertilization guidance failed');
    }

    console.log(`   Retrieved fertilization info for: ${response.data.fertilization.crop}`);
  }

  async testMarketPrices() {
    const response = await axios.get(`${this.baseURL}/api/crops/market-prices?language=hindi`);

    if (response.status !== 200 || !response.data.prices) {
      throw new Error('Market prices failed');
    }

    console.log(`   Retrieved ${response.data.prices.length} market prices`);
    console.log(`   Sample prices: ${response.data.prices.slice(0, 3).map(p => `${p.crop}: ₹${p.price}`).join(', ')}`);
  }

  async testChatMessage() {
    const messageData = {
      message: 'मुझे चावल की खेती के बारे में जानकारी चाहिए',
      language: 'hindi'
    };

    const response = await axios.post(`${this.baseURL}/api/chat/message`, messageData, {
      headers: { Authorization: `Bearer ${this.authToken}` }
    });

    if (response.status !== 200 || !response.data.response) {
      throw new Error('Chat message failed');
    }

    console.log('   Chat message sent and received response');
    console.log(`   Response type: ${response.data.classification}`);
  }

  async testChatHistory() {
    const response = await axios.get(`${this.baseURL}/api/chat/history`, {
      headers: { Authorization: `Bearer ${this.authToken}` }
    });

    if (response.status !== 200) {
      throw new Error('Chat history failed');
    }

    console.log(`   Retrieved chat history with ${response.data.messages.length} messages`);
  }

  async testCreateCalendar() {
    const cropsResponse = await axios.get(`${this.baseURL}/api/crops`);
    const cropId = cropsResponse.data.crops[0].id;

    const calendarData = {
      cropId: cropId,
      plantingDate: new Date().toISOString(),
      language: 'hindi'
    };

    const response = await axios.post(`${this.baseURL}/api/calendar`, calendarData, {
      headers: { Authorization: `Bearer ${this.authToken}` }
    });

    if (response.status !== 201 || !response.data.calendar) {
      throw new Error('Create calendar failed');
    }

    console.log(`   Created calendar for: ${response.data.calendar.crop}`);
  }

  async testGetCalendars() {
    const response = await axios.get(`${this.baseURL}/api/calendar`, {
      headers: { Authorization: `Bearer ${this.authToken}` }
    });

    if (response.status !== 200 || !response.data.calendars) {
      throw new Error('Get calendars failed');
    }

    console.log(`   Retrieved ${response.data.calendars.length} calendars`);
  }

  async testUpcomingActivities() {
    const response = await axios.get(`${this.baseURL}/api/calendar/upcoming/activities?days=30&language=hindi`, {
      headers: { Authorization: `Bearer ${this.authToken}` }
    });

    if (response.status !== 200 || !response.data.activities) {
      throw new Error('Get upcoming activities failed');
    }

    console.log(`   Retrieved ${response.data.activities.length} upcoming activities`);
  }

  async testVoiceLanguages() {
    const response = await axios.get(`${this.baseURL}/api/voice/languages`);

    if (response.status !== 200 || !response.data.languages) {
      throw new Error('Get voice languages failed');
    }

    console.log(`   Supported languages: ${response.data.languages.join(', ')}`);
  }

  async testVoiceFormats() {
    const response = await axios.get(`${this.baseURL}/api/voice/formats`);

    if (response.status !== 200 || !response.data.formats) {
      throw new Error('Get voice formats failed');
    }

    console.log(`   Supported formats: ${response.data.formats.join(', ')}`);
  }

  async testTrainingStats() {
    const response = await axios.get(`${this.baseURL}/api/training/stats`, {
      headers: { Authorization: `Bearer ${this.authToken}` }
    });

    if (response.status !== 200 || !response.data.stats) {
      throw new Error('Get training stats failed');
    }

    console.log(`   Training stats: ${response.data.stats.totalSamples} samples`);
    console.log(`   Categories: ${Object.keys(response.data.stats.categories).join(', ')}`);
  }

  async testTrainingPerformance() {
    const response = await axios.get(`${this.baseURL}/api/training/performance`, {
      headers: { Authorization: `Bearer ${this.authToken}` }
    });

    if (response.status !== 200 || !response.data.performance) {
      throw new Error('Get training performance failed');
    }

    console.log(`   Model accuracy: ${response.data.performance.accuracy}%`);
  }

  async testAddTrainingData() {
    const trainingData = {
      text: 'टमाटर की खेती कैसे करें?',
      category: 'crop_recommendation',
      language: 'hindi'
    };

    const response = await axios.post(`${this.baseURL}/api/training/add-data`, trainingData, {
      headers: { Authorization: `Bearer ${this.authToken}` }
    });

    if (response.status !== 200 || !response.data.success) {
      throw new Error('Add training data failed');
    }

    console.log('   Training data added successfully');
  }

  async testModelTest() {
    const testData = {
      queries: [
        'What crop should I plant?',
        'कीट नियंत्रण कैसे करें?',
        'పంట కోత ఎప్పుడు?'
      ],
      language: 'english'
    };

    const response = await axios.post(`${this.baseURL}/api/training/test`, testData, {
      headers: { Authorization: `Bearer ${this.authToken}` }
    });

    if (response.status !== 200 || !response.data.results) {
      throw new Error('Model test failed');
    }

    console.log(`   Model tested with ${response.data.results.length} queries`);
    response.data.results.forEach((result, index) => {
      console.log(`   Query ${index + 1}: ${result.success ? 'PASSED' : 'FAILED'}`);
    });
  }

  async testMultilingualQueries() {
    const queries = [
      { message: 'What crop should I plant in kharif season?', language: 'english' },
      { message: 'फसल सुझाव चाहिए', language: 'hindi' },
      { message: 'పంట సిఫార్సు కావాలి', language: 'telugu' }
    ];

    for (const query of queries) {
      const response = await axios.post(`${this.baseURL}/api/chat/message`, query, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });

      if (response.status !== 200) {
        throw new Error(`Multilingual query failed for ${query.language}`);
      }

      console.log(`   ${query.language} query processed successfully`);
    }
  }

  async testFrontendRoutes() {
    try {
      const response = await axios.get(`${this.baseURL}/`);
      if (response.status !== 200) {
        throw new Error('Frontend not accessible');
      }
      console.log('   Frontend is accessible');
    } catch (error) {
      throw new Error('Frontend route test failed');
    }
  }

  async runAllTests() {
    console.log('🚀 Starting AgroMitra Test Suite');
    console.log('=====================================');

    // Server Health Tests
    await this.runTest('Server Health Check', () => this.testServerHealth());

    // Authentication Tests
    await this.runTest('User Registration', () => this.testUserRegistration());
    await this.runTest('User Login', () => this.testUserLogin());
    await this.runTest('Get User Profile', () => this.testGetUserProfile());

    // Crop API Tests
    await this.runTest('Get All Crops', () => this.testGetCrops());
    await this.runTest('Crop Recommendation', () => this.testCropRecommendation());
    await this.runTest('Get Specific Crop', () => this.testGetSpecificCrop());
    await this.runTest('Crop Harvesting Guidance', () => this.testCropHarvestingGuidance());
    await this.runTest('Crop Pest Control', () => this.testCropPestControl());
    await this.runTest('Crop Irrigation', () => this.testCropIrrigation());
    await this.runTest('Crop Fertilization', () => this.testCropFertilization());
    await this.runTest('Market Prices', () => this.testMarketPrices());

    // Chat API Tests
    await this.runTest('Chat Message', () => this.testChatMessage());
    await this.runTest('Chat History', () => this.testChatHistory());

    // Calendar API Tests
    await this.runTest('Create Calendar', () => this.testCreateCalendar());
    await this.runTest('Get Calendars', () => this.testGetCalendars());
    await this.runTest('Upcoming Activities', () => this.testUpcomingActivities());

    // Voice API Tests
    await this.runTest('Voice Languages', () => this.testVoiceLanguages());
    await this.runTest('Voice Formats', () => this.testVoiceFormats());

    // Training API Tests
    await this.runTest('Training Stats', () => this.testTrainingStats());
    await this.runTest('Training Performance', () => this.testTrainingPerformance());
    await this.runTest('Add Training Data', () => this.testAddTrainingData());
    await this.runTest('Model Test', () => this.testModelTest());

    // Multilingual Tests
    await this.runTest('Multilingual Queries', () => this.testMultilingualQueries());

    // Frontend Tests
    await this.runTest('Frontend Routes', () => this.testFrontendRoutes());

    // Generate Test Report
    this.generateTestReport();
  }

  generateTestReport() {
    console.log('\n📊 Test Results Summary');
    console.log('========================');
    console.log(`Total Tests: ${this.testResults.total}`);
    console.log(`Passed: ${this.testResults.passed}`);
    console.log(`Failed: ${this.testResults.failed}`);
    console.log(`Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(2)}%`);

    console.log('\n📋 Detailed Results');
    console.log('===================');
    this.testResults.details.forEach(result => {
      const status = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`${status} ${result.test}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    // Save test accounts
    if (TEST_ACCOUNTS.length > 0) {
      fs.writeFileSync('test-accounts.json', JSON.stringify(TEST_ACCOUNTS, null, 2));
      console.log('\n💾 Test accounts saved to test-accounts.json');
    }

    // Save test report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.testResults.total,
        passed: this.testResults.passed,
        failed: this.testResults.failed,
        successRate: (this.testResults.passed / this.testResults.total) * 100
      },
      details: this.testResults.details,
      testAccounts: TEST_ACCOUNTS
    };

    fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2));
    console.log('📄 Detailed test report saved to test-report.json');
  }
}

// Run the test suite
async function main() {
  const testSuite = new AgroMitraTestSuite();
  await testSuite.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = AgroMitraTestSuite;
