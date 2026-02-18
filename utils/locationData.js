// Indian States and their agricultural characteristics
const IndianStates = {
  'maharashtra': {
    name: 'Maharashtra',
    soilTypes: ['black', 'red', 'laterite'],
    primaryCrops: ['sugarcane', 'cotton', 'onion', 'chili'],
    region: 'western'
  },
  'karnataka': {
    name: 'Karnataka',
    soilTypes: ['red', 'laterite', 'black'],
    primaryCrops: ['coffee', 'sugarcane', 'cotton', 'rice'],
    region: 'southern'
  },
  'tamilnadu': {
    name: 'Tamil Nadu',
    soilTypes: ['red', 'laterite', 'alluvial'],
    primaryCrops: ['rice', 'sugarcane', 'cotton', 'chili'],
    region: 'southern'
  },
  'telangana': {
    name: 'Telangana',
    soilTypes: ['black', 'red', 'laterite'],
    primaryCrops: ['rice', 'sugarcane', 'cotton', 'groundnut'],
    region: 'southern'
  },
  'andhra_pradesh': {
    name: 'Andhra Pradesh',
    soilTypes: ['alluvial', 'red', 'black'],
    primaryCrops: ['rice', 'sugarcane', 'groundnut', 'maize'],
    region: 'southern'
  },
  'west_bengal': {
    name: 'West Bengal',
    soilTypes: ['alluvial'],
    primaryCrops: ['rice', 'potato', 'jute', 'mustard'],
    region: 'eastern'
  },
  'uttar_pradesh': {
    name: 'Uttar Pradesh',
    soilTypes: ['alluvial', 'black'],
    primaryCrops: ['wheat', 'rice', 'sugarcane', 'potato'],
    region: 'northern'
  },
  'punjab': {
    name: 'Punjab',
    soilTypes: ['alluvial'],
    primaryCrops: ['wheat', 'rice', 'cotton', 'maize'],
    region: 'northern'
  },
  'haryana': {
    name: 'Haryana',
    soilTypes: ['alluvial', 'black'],
    primaryCrops: ['wheat', 'rice', 'maize', 'cotton'],
    region: 'northern'
  },
  'madhya_pradesh': {
    name: 'Madhya Pradesh',
    soilTypes: ['black', 'red', 'laterite'],
    primaryCrops: ['wheat', 'cotton', 'soybean', 'groundnut'],
    region: 'central'
  },
  'rajasthan': {
    name: 'Rajasthan',
    soilTypes: ['desert', 'red', 'saline'],
    primaryCrops: ['groundnut', 'cotton', 'mustard', 'maize'],
    region: 'northern'
  },
  'bihar': {
    name: 'Bihar',
    soilTypes: ['alluvial'],
    primaryCrops: ['rice', 'wheat', 'potato', 'maize'],
    region: 'eastern'
  },
  'guajarat': {
    name: 'Gujarat',
    soilTypes: ['black', 'red', 'desert'],
    primaryCrops: ['groundnut', 'cotton', 'sugarcane', 'maize'],
    region: 'western'
  }
};

// Get location data
const getLocationData = (locationName) => {
  const key = locationName.toLowerCase().replace(/\s+/g, '_');
  return IndianStates[key] || null;
};

// Get all states
const getAllStates = () => {
  return Object.values(IndianStates).map(state => state.name);
};

// Get states by region
const getStatesByRegion = (region) => {
  return Object.values(IndianStates)
    .filter(state => state.region === region.toLowerCase())
    .map(state => state.name);
};

// Get optimal soil type for location
const getOptimalSoilType = (locationName) => {
  const location = getLocationData(locationName);
  return location ? location.soilTypes[0] : null;
};

module.exports = {
  IndianStates,
  getLocationData,
  getAllStates,
  getStatesByRegion,
  getOptimalSoilType
};
