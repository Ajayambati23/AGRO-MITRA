const express = require('express');
const axios = require('axios');

const router = express.Router();

const INDIA_LOCATION_FALLBACKS = {
  'andhra pradesh': { lat: 15.9129, lon: 79.74, label: 'Andhra Pradesh, India' },
  'arunachal pradesh': { lat: 28.218, lon: 94.7278, label: 'Arunachal Pradesh, India' },
  assam: { lat: 26.2006, lon: 92.9376, label: 'Assam, India' },
  bihar: { lat: 25.0961, lon: 85.3131, label: 'Bihar, India' },
  chhattisgarh: { lat: 21.2787, lon: 81.8661, label: 'Chhattisgarh, India' },
  goa: { lat: 15.2993, lon: 74.124, label: 'Goa, India' },
  gujarat: { lat: 22.2587, lon: 71.1924, label: 'Gujarat, India' },
  haryana: { lat: 29.0588, lon: 76.0856, label: 'Haryana, India' },
  himachalpradesh: { lat: 31.1048, lon: 77.1734, label: 'Himachal Pradesh, India' },
  'himachal pradesh': { lat: 31.1048, lon: 77.1734, label: 'Himachal Pradesh, India' },
  jharkhand: { lat: 23.61, lon: 85.2799, label: 'Jharkhand, India' },
  karnataka: { lat: 15.3173, lon: 75.7139, label: 'Karnataka, India' },
  kerala: { lat: 10.8505, lon: 76.2711, label: 'Kerala, India' },
  'madhya pradesh': { lat: 22.9734, lon: 78.6569, label: 'Madhya Pradesh, India' },
  maharashtra: { lat: 19.7515, lon: 75.7139, label: 'Maharashtra, India' },
  manipur: { lat: 24.6637, lon: 93.9063, label: 'Manipur, India' },
  meghalaya: { lat: 25.467, lon: 91.3662, label: 'Meghalaya, India' },
  mizoram: { lat: 23.1645, lon: 92.9376, label: 'Mizoram, India' },
  nagaland: { lat: 26.1584, lon: 94.5624, label: 'Nagaland, India' },
  odisha: { lat: 20.9517, lon: 85.0985, label: 'Odisha, India' },
  punjab: { lat: 31.1471, lon: 75.3412, label: 'Punjab, India' },
  rajasthan: { lat: 27.0238, lon: 74.2179, label: 'Rajasthan, India' },
  sikkim: { lat: 27.533, lon: 88.5122, label: 'Sikkim, India' },
  tamilnadu: { lat: 11.1271, lon: 78.6569, label: 'Tamil Nadu, India' },
  'tamil nadu': { lat: 11.1271, lon: 78.6569, label: 'Tamil Nadu, India' },
  telangana: { lat: 18.1124, lon: 79.0193, label: 'Telangana, India' },
  tripura: { lat: 23.9408, lon: 91.9882, label: 'Tripura, India' },
  'uttar pradesh': { lat: 26.8467, lon: 80.9462, label: 'Uttar Pradesh, India' },
  uttarakhand: { lat: 30.0668, lon: 79.0193, label: 'Uttarakhand, India' },
  'west bengal': { lat: 22.9868, lon: 87.855, label: 'West Bengal, India' },
  delhi: { lat: 28.7041, lon: 77.1025, label: 'Delhi, India' },
  puducherry: { lat: 11.9416, lon: 79.8083, label: 'Puducherry, India' },
  chandigarh: { lat: 30.7333, lon: 76.7794, label: 'Chandigarh, India' },
};

function normalizeLocationKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/,?\s*india\s*$/i, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getFallbackCoordinates(location) {
  const normalized = normalizeLocationKey(location);
  if (!normalized) return null;

  const direct = INDIA_LOCATION_FALLBACKS[normalized];
  if (direct) return direct;

  const parts = normalized.split(',').map((part) => part.trim()).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const key = parts[i];
    if (INDIA_LOCATION_FALLBACKS[key]) {
      return INDIA_LOCATION_FALLBACKS[key];
    }
  }

  const words = normalized.split(' ');
  for (let i = 0; i < words.length; i += 1) {
    for (let j = words.length; j > i; j -= 1) {
      const key = words.slice(i, j).join(' ');
      if (INDIA_LOCATION_FALLBACKS[key]) {
        return INDIA_LOCATION_FALLBACKS[key];
      }
    }
  }

  return null;
}

function weatherCodeToText(code) {
  const map = {
    0: 'Clear',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Light rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Light snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    80: 'Rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    95: 'Thunderstorm'
  };
  return map[code] || 'Unknown';
}

function buildFarmingAlerts({ tempC, windKph, rainProb, humidity }) {
  const alerts = [];
  if (tempC >= 38) alerts.push('High heat expected. Irrigate early morning or evening.');
  if (tempC <= 10) alerts.push('Low temperature risk. Protect sensitive crops.');
  if (rainProb >= 70) alerts.push('High chance of rain. Delay fertilizer or pesticide spray.');
  if (windKph >= 25) alerts.push('Strong winds. Avoid spray operations today.');
  if (humidity >= 85) alerts.push('High humidity. Increase pest and fungal disease monitoring.');
  return alerts;
}

router.get('/current', async (req, res) => {
  try {
    const { location, latitude, longitude } = req.query;
    let lat = latitude ? Number(latitude) : null;
    let lon = longitude ? Number(longitude) : null;
    let resolvedLocation = location || null;

    if ((lat == null || lon == null) && location) {
      const geoResp = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
        params: { name: location, count: 1, language: 'en', format: 'json' },
        timeout: 7000
      });
      const hit = geoResp.data?.results?.[0];
      if (!hit) {
        const fallback = getFallbackCoordinates(location);
        if (!fallback) {
          return res.status(400).json({ message: `Could not resolve location: ${location}` });
        }
        lat = fallback.lat;
        lon = fallback.lon;
        resolvedLocation = fallback.label;
      } else {
        lat = hit.latitude;
        lon = hit.longitude;
        resolvedLocation = `${hit.name}, ${hit.admin1 || hit.country}`;
      }
    }

    if (lat == null || lon == null) {
      return res.status(400).json({ message: 'Provide either location or latitude/longitude' });
    }

    const weatherResp = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat,
        longitude: lon,
        current: 'temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m',
        daily: 'precipitation_probability_max',
        timezone: 'auto',
        forecast_days: 1
      },
      timeout: 7000
    });

    const current = weatherResp.data?.current || {};
    const daily = weatherResp.data?.daily || {};
    const rainProb = Array.isArray(daily.precipitation_probability_max)
      ? Number(daily.precipitation_probability_max[0] || 0)
      : 0;
    const tempC = Number(current.temperature_2m ?? 0);
    const windKph = Number(current.wind_speed_10m ?? 0);
    const humidity = Number(current.relative_humidity_2m ?? 0);
    const condition = weatherCodeToText(Number(current.weather_code));

    res.json({
      location: resolvedLocation || `${lat}, ${lon}`,
      latitude: lat,
      longitude: lon,
      tempC,
      windKph,
      humidity,
      rainProbability: rainProb,
      condition,
      alerts: buildFarmingAlerts({ tempC, windKph, rainProb, humidity }),
      updatedAt: new Date().toISOString(),
      source: 'Open-Meteo'
    });
  } catch (error) {
    console.error('Weather API error:', error.message);
    res.status(500).json({ message: 'Failed to fetch weather data' });
  }
});

module.exports = router;
