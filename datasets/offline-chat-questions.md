# Questions Answered in Offline Mode

When the app runs **without OpenAI** (or when OpenAI fails), the local AI uses the trained dataset and database to answer. Below are the **question types** that get a real answer offline, and what the user should ask.

---

## Fully answered offline (with your location & soil when relevant)

| Category | What you get | Example questions (EN / HI / TE) |
|----------|----------------|----------------------------------|
| **Crop recommendation** | Crops for your **registered soil type & location**, current season | "What crop to plant?", "फसल सुझाव चाहिए", "ఏ పంట నాటాలి" |
| **Harvesting guidance** | When and how to harvest a **specific crop** | "When to harvest rice?", "कब काटें गेहूं?", "ఎప్పుడు కోయాలి వరి?" |
| **Pest control** | Common pests and control methods from crop DB | "How to control pests?", "कीट नियंत्रण कैसे करें?", "కీటక నియంత్రణ ఎలా?" |
| **Irrigation** | Water schedule and methods for a **specific crop** | "How often to water tomatoes?", "पानी कब दें?", "నీరు ఎప్పుడు ఇవ్వాలి?" |
| **Fertilization** | NPK, schedule, organic options for a **specific crop** | "When to apply fertilizer?", "खाद कब डालें?", "ఎరువు ఎప్పుడు వేయాలి?" |
| **Market price** | Price info for a **specific crop** from DB | "What is the price of rice?", "बाजार मूल्य क्या है?", "మార్కెట్ ధర ఎంత?" |

---

## Answered with a placeholder (offline)

| Category | Offline response |
|----------|------------------|
| **Weather** | "Weather information will be available soon." (no API in offline path) |

---

## General / other questions (offline)

| Category | What you get |
|----------|----------------|
| **General** (or unknown intent) | Welcome message + suggestion prompts (crop recommendation, harvesting, pest control, irrigation). No specific answer to a random question. |

---

## Requirements for best offline answers

- **Crop recommendation**: Uses your **registered location (state)** and **soil type** from your profile. No need to type them in the question.
- **Harvesting / Irrigation / Fertilization / Market price**: The bot needs a **crop name** in the question (e.g. rice, wheat, tomato) or it will ask you to specify. Supported examples: rice, wheat, maize, cotton, sugarcane, tomato, potato, onion (and equivalents in Hindi/Telugu in the classifier).
- **Languages**: Training data includes **English, Hindi, Telugu**; similar phrases in other languages may still be classified if they are close to trained phrases.

---

## Summary

**Fully answered offline:** Crop recommendation (with your profile), harvesting, pest control, irrigation, fertilization, market price — as long as the question matches one of these intents and, where needed, includes a crop name.

**Placeholder only:** Weather.

**Generic reply:** Any other question (general welcome + suggestions).
