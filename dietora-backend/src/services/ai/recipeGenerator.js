// src/services/ai/recipeGenerator.js
// DIETORA — Recipe Generator (Groq — Free & Fast)

'use strict';

const { ChatGroq } = require('@langchain/groq');
const { SystemMessage, HumanMessage } = require('@langchain/core/messages');

const withRetry = async (fn, retries = 2, delayMs = 800) => {
  let lastErr;
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isRetryable =
        err.status === 429 ||
        err.message?.includes('rate_limit') ||
        err.message?.includes('network');
      if (!isRetryable || attempt > retries) break;
      const wait = delayMs * attempt;
      console.warn(`[RecipeGenerator] Attempt ${attempt} failed. Retrying in ${wait}ms...`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw lastErr;
};

const generateTailoredRecipe = async (foodName, healthProfile) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    throw new Error('GROQ_API_KEY is missing from .env — get free key at console.groq.com');
  }

  const model = new ChatGroq({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    apiKey,
    temperature: 0.7,
    maxTokens: 1000,
  });

  const conditions = [];
  if (healthProfile.isDiabetic)       conditions.push('Diabetes');
  if (healthProfile.isHypertensive)   conditions.push('Hypertension');
  if (healthProfile.isCardiac)        conditions.push('Cardiac Disease');
  if (healthProfile.hasKidneyDisease) conditions.push('Kidney Disease');
  if (healthProfile.hasThyroid)       conditions.push('Thyroid');

  const conditionStr = conditions.length > 0 ? conditions.join(', ') : 'No specific conditions';
  const allergies = healthProfile.allergies?.join(', ') || 'None';

  const systemPrompt = `You are a clinical dietitian and Pakistani chef.
Generate a recipe for "${foodName}" tailored to the patient's medical conditions.
Patient conditions: ${conditionStr}
Patient allergies: ${allergies}

Rules:
1. Modify ingredients to be medically safe (low sugar for diabetes, low sodium for hypertension, low fat for cardiac, etc.)
2. Avoid any allergens.
3. Keep instructions short and easy to follow.
4. Return ONLY valid JSON — no markdown, no explanation outside the JSON.

JSON format:
{
  "title": "string",
  "prepTime": "string",
  "ingredients": ["string"],
  "instructions": ["string"],
  "medicalNote": "string — how this recipe was tailored for their conditions"
}`;

  return withRetry(async () => {
    const res = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`Recipe for: ${foodName}`),
    ]);

    let raw = res.content.trim()
      .replace(/^```(?:json)?\s*/im, '')
      .replace(/\s*```\s*$/m, '')
      .trim();

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No valid JSON in recipe response.');
    return JSON.parse(jsonMatch[0]);
  });
};

module.exports = { generateTailoredRecipe };
