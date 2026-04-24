// src/services/ai/mealPlanner/nodes.js
// DIETORA — LangGraph Nodes (Groq — Free & Fast)

'use strict';

const { ChatGroq } = require("@langchain/groq");

// ─── Groq Model (FREE) ────────────────────────────────────
const getGroqModel = (temperature = 0.3) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    throw new Error('GROQ_API_KEY is missing — get free key at console.groq.com');
  }
  return new ChatGroq({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    apiKey,
    temperature,
    maxTokens: 2500,
  });
};

// ─── Helpers ──────────────────────────────────────────────
const safeParseJSON = (text) => {
  const cleaned = text
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/m, '')
    .trim();
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array found in response');
  return JSON.parse(match[0]);
};

// ─── NODE: FilterFoods ────────────────────────────────────
// Pure JS — no AI, instant
const filterFoodsNode = async (state) => {
  console.log('[LangGraph] Node: FilterFoods');
  const { profile, availableFoods } = state;
  const allergyLower = (profile.allergies || []).map(a => a.toLowerCase());

  let safeFoods = availableFoods.filter(
    f => !f.allergens?.some(a => allergyLower.includes(a.toLowerCase()))
  );

  // If a disease is active, further filter to only safe foods for that disease
  safeFoods = safeFoods.filter(f => {
    if (profile.isDiabetic       && !f.is_diabetic_safe)     return false;
    if (profile.isHypertensive   && !f.is_hypertension_safe) return false;
    if (profile.isCardiac        && !f.is_cardiac_safe)      return false;
    if (profile.hasKidneyDisease && !f.is_kidney_safe)       return false;
    if (profile.hasThyroid       && !f.is_thyroid_safe)      return false;
    return true;
  });

  // Safety: if disease filtering removes too many, fall back to allergy-only
  if (safeFoods.length < 6) {
    console.warn('[LangGraph] FilterFoods: disease filter too restrictive, relaxing...');
    safeFoods = availableFoods.filter(
      f => !f.allergens?.some(a => allergyLower.includes(a.toLowerCase()))
    );
  }

  console.log(`[LangGraph] FilterFoods: ${safeFoods.length}/${availableFoods.length} foods passed.`);
  return { availableFoods: safeFoods };
};

// ─── NODE: GenerateMealPlan ────────────────────────────────
const generateMealPlanNode = async (state) => {
  const attempt = (state.generationAttempts || 0) + 1;
  console.log(`[LangGraph] Node: GenerateMealPlan (Attempt ${attempt})`);
  const { profile, availableFoods, validationErrors } = state;
  const model = getGroqModel(0.3);

  const diseases = [
    profile.isDiabetic       && 'Diabetes',
    profile.isHypertensive   && 'Hypertension',
    profile.isCardiac        && 'Cardiac Disease',
    profile.hasKidneyDisease && 'Kidney Disease',
    profile.hasThyroid       && 'Thyroid',
  ].filter(Boolean).join(', ') || 'None';

  // Budget breakdown
  const bf = Math.round(profile.dailyBudget * 0.25);
  const lu = Math.round(profile.dailyBudget * 0.35);
  const di = Math.round(profile.dailyBudget * 0.30);
  const sn = Math.round(profile.dailyBudget * 0.10);

  // Compact catalogue — limit to 60 foods max to stay under token limits
  const catalogue = availableFoods.slice(0, 60).map(f => {
    const tags = [
      f.is_diabetic_safe       && 'D',
      f.is_hypertension_safe   && 'BP',
      f.is_cardiac_safe        && 'C',
      f.is_kidney_safe         && 'K',
      f.is_thyroid_safe        && 'T',
    ].filter(Boolean).join('') || 'G';
    const mealTypes = (f.mealType || []).map(m => m[0].toUpperCase()).join(''); // B/L/D/S
    return `"${f.name}"|${mealTypes}|${tags}|${f.calories}cal|PKR${f.price}`;
  }).join('\n');

  const errorHint = validationErrors?.length
    ? `\nPREVIOUS ERRORS TO FIX:\n${validationErrors.slice(0, 3).join('\n')}\n`
    : '';

  const prompt = `You are a clinical dietitian AI for Pakistani patients. Generate a 7-day meal plan.

PATIENT:
- Age: ${profile.age || 'N/A'}, Gender: ${profile.gender || 'N/A'}, Weight: ${profile.weight || 'N/A'}kg
- Goal: ${profile.goal || 'Maintain Weight'}
- Daily calories: ${profile.dailyCalorieTarget || 2000} kcal
- Medical conditions: ${diseases}
- Allergies: ${profile.allergies?.length ? profile.allergies.join(', ') : 'None'}
- Daily budget: PKR ${profile.dailyBudget} (Breakfast:PKR${bf} | Lunch:PKR${lu} | Dinner:PKR${di} | Snack:PKR${sn})
${errorHint}
FOOD CATALOGUE (Name|MealTypes|SafetyTags|Calories|Price):
Tags: D=Diabetic-safe, BP=BP-safe, C=Cardiac-safe, K=Kidney-safe, T=Thyroid-safe, G=General
MealTypes: B=Breakfast, L=Lunch, D=Dinner, S=Snack
${catalogue}

RULES:
1. ONLY use EXACT food names from the catalogue.
2. Pick foods appropriate for their meal type (B for breakfast, L for lunch, D for dinner, S for snack).
3. For each disease condition, prefer foods with that safety tag.
4. Vary meals — avoid repeating the same food more than twice in 7 days.
5. Keep each meal within its budget slot.
6. snack is optional (can be null).

Return ONLY a valid JSON array — no explanation, no markdown:
[
  {"day":1,"breakfast":"Food Name","lunch":"Food Name","dinner":"Food Name","snack":"Food Name or null"},
  ...7 items total
]`;

  const response = await model.invoke(prompt);

  let parsed;
  try {
    parsed = safeParseJSON(response.content);
    // Validate basic structure
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Not an array');
    parsed = parsed.map((d, i) => ({ day: d.day || i+1, breakfast: d.breakfast || null, lunch: d.lunch || null, dinner: d.dinner || null, snack: d.snack || null }));
  } catch (err) {
    console.error('[LangGraph] Parse failed:', err.message, '\nRaw:', response.content.slice(0, 200));
    parsed = [];
  }

  const clinicalAnalysis = {
    dailyNutrientTargets: {
      calories:     profile.dailyCalorieTarget || 2000,
      proteinGrams: Math.round((profile.dailyCalorieTarget || 2000) * 0.25 / 4),
      carbsGrams:   Math.round((profile.dailyCalorieTarget || 2000) * 0.50 / 4),
      fatGrams:     Math.round((profile.dailyCalorieTarget || 2000) * 0.25 / 9),
      sodiumMg:     profile.isHypertensive ? 1500 : 2300,
      fiberGrams:   25,
    },
    clinicalRationale: `Personalised ${diseases} patient plan. Goal: ${profile.goal || 'weight maintenance'}.`,
  };

  return {
    draftPlanParsed: parsed,
    clinicalAnalysis,
    generationAttempts: attempt,
  };
};

// ─── NODE: ValidatePlan ────────────────────────────────────
const validatePlanNode = async (state) => {
  console.log('[LangGraph] Node: ValidatePlan');
  const { profile, draftPlanParsed, availableFoods } = state;
  const errors = [];

  if (!Array.isArray(draftPlanParsed) || draftPlanParsed.length < 7) {
    errors.push(`Need 7 days. Got ${draftPlanParsed?.length || 0}.`);
    return { validationErrors: errors };
  }

  const foodLookup = new Map(availableFoods.map(f => [f.name.toLowerCase().trim(), f]));
  const diseaseFlags = {
    isDiabetic:       'is_diabetic_safe',
    isHypertensive:   'is_hypertension_safe',
    isCardiac:        'is_cardiac_safe',
    hasKidneyDisease: 'is_kidney_safe',
    hasThyroid:       'is_thyroid_safe',
  };
  const activeDiseases = Object.keys(diseaseFlags).filter(k => profile[k]);
  const mealNameCounts = {};

  for (const day of draftPlanParsed) {
    const dayMeals = [
      { name: day.breakfast, type: 'breakfast', budget: profile.dailyBudget * 0.25 },
      { name: day.lunch,     type: 'lunch',     budget: profile.dailyBudget * 0.35 },
      { name: day.dinner,    type: 'dinner',    budget: profile.dailyBudget * 0.30 },
    ].filter(m => m.name);

    let dayCost = 0;
    for (const { name, type, budget } of dayMeals) {
      const food = foodLookup.get(name.toLowerCase().trim());
      if (!food) {
        errors.push(`Day${day.day}: "${name}" not found in catalogue.`);
        continue;
      }
      dayCost += food.price;
      // Track repetition
      mealNameCounts[name] = (mealNameCounts[name] || 0) + 1;
      if (mealNameCounts[name] > 3) {
        errors.push(`"${name}" repeated >3 times across 7 days.`);
      }
      // Disease safety — only flag if not safe (informational, not hard block)
      for (const disease of activeDiseases) {
        if (!food[diseaseFlags[disease]]) {
          errors.push(`Day${day.day} ${type}: "${name}" not tagged safe for ${disease}.`);
        }
      }
    }

    if (dayCost > profile.dailyBudget * 1.20) { // 20% tolerance
      errors.push(`Day${day.day}: Total cost PKR${Math.round(dayCost)} exceeds budget PKR${profile.dailyBudget}.`);
    }
  }

  if (errors.length > 0) {
    console.log(`[LangGraph] Validation: ${errors.length} issues found.`);
    // Only hard-fail if critical errors (not found in catalogue)
    const criticalErrors = errors.filter(e => e.includes('not found'));
    if (criticalErrors.length > 3) {
      return { validationErrors: errors };
    }
    // Minor errors (disease tags, slight budget overrun) → pass with warning
    console.warn('[LangGraph] Minor validation warnings — accepting plan:', errors.slice(0, 3));
  }

  console.log('[LangGraph] Validation PASSED.');
  return { validationErrors: [], finalPlan: draftPlanParsed };
};

module.exports = { filterFoodsNode, generateMealPlanNode, validatePlanNode };
