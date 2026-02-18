/**
 * Service to recommend pesticides based on plant disease image.
 * Can be extended to use a real ML model or external API (e.g. PlantVillage).
 */

const OpenAI = require('openai');

const COMMON_RECOMMENDATIONS = {
  default: {
    message: 'Based on the plant image, here are general recommendations for disease and pest management:\n\n' +
      '**Common steps:**\n' +
      '1. **Neem oil spray** – Mix 5 ml neem oil in 1 litre water; spray every 7–10 days. Good for fungal issues and soft pests.\n' +
      '2. **Bordeaux mixture** – For fungal diseases (leaf spot, blight). Use as per label.\n' +
      '3. **Sulphur-based fungicide** – For powdery mildew. Apply in cool hours.\n' +
      '4. **Remove affected leaves** – Prune and destroy severely infected parts to stop spread.\n\n' +
      '**If you see:**\n' +
      '- **Yellow/brown spots on leaves** → Likely fungal; try Carbendazim or Mancozeb as per label.\n' +
      '- **White powdery coating** → Powdery mildew; use wettable sulphur or Dinocap.\n' +
      '- **Chewed leaves / insects** → Spray Neem oil or recommended insecticide (e.g. Imidacloprid for sap-suckers) as per local advice.\n\n' +
      'Always follow label dosage and safety. For accurate diagnosis, show the sample to your local Krishi Vigyan Kendra (KVK) or agronomist.',
    classification: 'pest_control',
  },
};

async function recommendFromImage(imageBase64, userMessage, language = 'english') {
  const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

  if (openai && imageBase64) {
    try {
      const imageUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userMessage
                  ? `The user says: "${userMessage}". Analyze this plant image for disease or pest damage and recommend specific pesticides or organic treatments. Reply in ${language}. Be concise but include product type and usage tips.`
                  : `Analyze this plant image for disease or pest damage. Recommend specific pesticides or organic treatments. Reply in ${language}. Include product type and usage tips.`,
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 600,
      });
      const message = response.choices?.[0]?.message?.content;
      if (message) {
        return { message, classification: 'pest_control' };
      }
    } catch (err) {
      console.error('OpenAI vision error, using fallback:', err.message);
    }
  }

  const fallback = COMMON_RECOMMENDATIONS.default;
  return { message: fallback.message, classification: fallback.classification };
}

module.exports = { recommendFromImage };
