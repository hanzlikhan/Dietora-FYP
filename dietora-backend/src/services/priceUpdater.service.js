// src/services/priceUpdater.service.js
// DIETORA — Real-Time Pakistani Food Price Engine
//
// Architecture (3-tier, waterfall):
//
//   Tier 1 — Serper.dev Google Search API (fastest, most accurate)
//     Real Google search results for Pakistani food prices. Fast REST call (~1-2s).
//     2,500 free searches/month on free tier.
//
//   Tier 2 — Gemini AI (no grounding, knowledge-based fallback)
//     If Serper fails, Gemini reasons from training data about Pakistani prices.
//     Better than random seeds.
//
//   Tier 3 — Curated static baseline prices
//     Hard-coded researched Faisalabad/Lahore/Karachi 2024-2025 market prices.
//     NEVER returns zero — always the last safety net.
//
// Caching: Serper prices cached 4h, AI 2h, static 24h.
// Concurrency: Single batched call per plan (not N individual calls).

'use strict';

const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ─── Gemini client (lazy singleton) ──────────────────────
let _genAI = null;
const getGeminiClient = () => {
  if (!_genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is missing from .env');
    _genAI = new GoogleGenerativeAI(key);
  }
  return _genAI;
};

// ─── In-memory price cache ────────────────────────────────
const _priceCache = new Map();
const TTL_SERPER  = 4  * 60 * 60 * 1000; // 4 hours
const TTL_AI      = 2  * 60 * 60 * 1000; // 2 hours
const TTL_STATIC  = 24 * 60 * 60 * 1000; // 24 hours

const _getCacheEntry = (name) => {
  const entry = _priceCache.get(name);
  if (!entry) return null;
  const ttl = entry.source === 'grounded' ? TTL_SERPER
    : entry.source === 'ai' ? TTL_AI
    : TTL_STATIC;
  return (Date.now() - entry.fetchedAt) < ttl ? entry : null;
};

const _setCache = (name, price, source) => {
  _priceCache.set(name, { price, source, fetchedAt: Date.now() });
};

// ─────────────────────────────────────────────────────────────────────────────
// TIER 3 — Static baseline prices (PKR, Faisalabad/Lahore/Karachi, April 2025)
// Serving-level prices (what you pay for one portion in a meal).
// ─────────────────────────────────────────────────────────────────────────────
const STATIC_PRICES = {
  // Breakfast
  'Aloo Paratha':               60,
  'Halwa Puri':                 90,
  'Anda Paratha':               70,
  'Doodh Pati Chai':            25,
  'Namkeen Lassi':              50,
  'Meethi Lassi':               60,
  'Anday ka Nashta':            65,
  'Khichdi':                    50,
  'Boiled Egg White Breakfast': 45,
  'Oats Porridge (Dalia)':      50,
  'Sattu Sharbat':              35,
  'Egg and Rice Bowl':          80,
  // Bread
  'Tandoori Roti':              20,
  'Chapati (Phulka)':           12,
  'Naan':                       30,
  // Lentils
  'Dal Masoor':                 80,
  'Dal Mash':                   90,
  'Dal Chana':                  85,
  'Chana Masala':               95,
  'Moong Dal (Yellow)':         75,
  'Lauki Dal (Low Protein)':    60,
  // Meat
  'Chicken Karahi':             280,
  'Chicken Roast (Desi)':       240,
  'Beef Qeema':                 220,
  'Mutton Karahi':              380,
  'Chicken Tikka (Grilled)':    300,
  'Steamed Fish (Rohu)':        200,
  'Chicken Soup (Yakhni)':      110,
  'Grilled Chicken Breast':     280,
  'Roasted Chicken with Rice':  250,
  'Cooked Carrots with Chicken':180,
  // Vegetables
  'Saag (Sarson)':              90,
  'Aloo Gosht':                 200,
  'Bhindi Masala':              80,
  'Karela (Bitter Gourd)':      65,
  'Tinda Masala':               70,
  'Palak Paneer':               150,
  'Lauki (Bottle Gourd) Sabzi': 60,
  'Turai (Ridge Gourd) Sabzi':  60,
  'Aloo Matar':                 85,
  'Gajar Gosht (Carrot Curry)': 160,
  // Rice
  'Plain Boiled Rice':          40,
  'Chicken Biryani':            220,
  'Matar Pulao':                100,
  'Brown Rice (Unpolished)':    55,
  // Dairy
  'Dahi (Plain Yogurt)':        55,
  'Raita':                      40,
  'Low-Fat Milk (1 glass)':     40,
  // Snacks & Beverages
  'Samosa (Baked)':             40,
  'Fruit Chaat':                80,
  'Roasted Chana':              30,
  'Seasonal Fruit (Mixed)':     70,
  'Apple (1 medium)':           45,
  'Guava (Amrood)':             30,
  'Mixed Nuts (Small Portion)': 100,
  'Cucumber Salad (Kheera)':    25,
  'Boiled Potato (Plain)':      30,
  'Green Tea':                  20,
  'Rice Porridge with Egg White': 65,
};

// ─────────────────────────────────────────────────────────────────────────────
// TIER 1 — Serper.dev Google Search API
//
// Single POST request with all food names. Uses Google search to find
// current PKR market prices. Returns a map of foodName → price.
// Much faster than Gemini grounding (1-2s vs 8-15s).
// ─────────────────────────────────────────────────────────────────────────────
const fetchPricesSerper = async (foodNames) => {
  if (!foodNames.length) return {};
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey || apiKey === 'your_serper_api_key_here') {
    throw new Error('SERPER_API_KEY not configured');
  }

  const today = new Date().toLocaleDateString('en-PK', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // Build a compact single query for all food names
  const query = `current PKR price per serving ${foodNames.slice(0, 10).join(', ')} Pakistan Faisalabad Lahore market ${today}`;

  const response = await axios.post(
    'https://google.serper.dev/search',
    { q: query, gl: 'pk', hl: 'en', num: 5 },
    {
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 8000,
    }
  );

  // Extract search snippets and use Gemini to parse prices from them
  const snippets = [
    ...(response.data?.organic || []).map(r => `${r.title}: ${r.snippet}`),
    ...(response.data?.knowledgeGraph ? [`${response.data.knowledgeGraph.title}: ${response.data.knowledgeGraph.description || ''}`] : []),
  ].slice(0, 8).join('\n');

  if (!snippets) throw new Error('Serper returned no results');

  // Use Gemini to extract structured prices from the search snippets
  const geminiModel = getGeminiClient().getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    generationConfig: { temperature: 0.1, maxOutputTokens: 800 },
  });

  const extractPrompt = `
You are a Pakistan food price analyst. Based on these Google search results, extract the current PKR serving-level prices for the food items listed.

Search results:
${snippets}

Food items to price (serving/portion price in PKR):
${foodNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Rules:
- Serving price = what one person pays for one meal portion (NOT per kg)
- Dal/Sabzi bowl: PKR 60-120 | Roti per piece: PKR 12-30 | Chicken dish: PKR 200-350
- If not found in search results, estimate based on your Pakistan market knowledge
- Return ONLY valid JSON, no markdown, no explanation

Format: {"Food Name": integer_pkr_price}
All ${foodNames.length} items must be in the response.
`.trim();

  const result = await geminiModel.generateContent(extractPrompt);
  const raw = result.response.text().trim()
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/m, '')
    .trim();

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in Serper+Gemini response');

  const parsed = JSON.parse(jsonMatch[0]);
  const valid = {};
  for (const [k, v] of Object.entries(parsed)) {
    const n = parseInt(v, 10);
    if (n > 0 && n < 50000) valid[k] = n;
  }

  return valid;
};

// ─────────────────────────────────────────────────────────────────────────────
// TIER 2 — Gemini AI knowledge fallback (no search)
// ─────────────────────────────────────────────────────────────────────────────
const fetchPricesAI = async (foodNames) => {
  if (!foodNames.length) return {};

  const prompt = `
You are a Pakistani food market pricing expert. Provide REALISTIC current retail prices for these food items in PKR.
These are SERVING-LEVEL prices as of 2025 in Faisalabad, Lahore, or Karachi.

${foodNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Price guidelines for Pakistan 2025:
- Tandoori Roti: PKR 15-25 per piece | Dal serving (bowl): PKR 70-120
- Sabzi serving (bowl): PKR 60-100 | Chicken dish serving: PKR 200-350
- Mutton dish serving: PKR 300-450 | Beverages (tea/lassi): PKR 20-70
- Snack portion: PKR 25-80 | Fruit portion: PKR 30-80

Return ONLY valid JSON. No markdown. No explanation.
Format: {"Food Name": integer_pkr_price}
All ${foodNames.length} items must be included.
`.trim();

  const model = getGeminiClient().getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
  });

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim()
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/m, '')
    .trim();

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in AI response');

  const parsed = JSON.parse(jsonMatch[0]);
  const valid = {};
  for (const [k, v] of Object.entries(parsed)) {
    const n = parseInt(v, 10);
    if (n > 0 && n < 50000) valid[k] = n;
  }
  return valid;
};

// ─────────────────────────────────────────────────────────────────────────────
// TIER 3 — Static lookup
// ─────────────────────────────────────────────────────────────────────────────
const getStaticPrice = (foodName, dbPrice) => STATIC_PRICES[foodName] || dbPrice || 50;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN — getPricesForFoods
// ─────────────────────────────────────────────────────────────────────────────
const getPricesForFoods = async (foodItems) => {
  if (!foodItems || foodItems.length === 0) return [];

  const result = new Map();
  const needsFetch = [];

  // Step 1: Serve from cache
  for (const item of foodItems) {
    const cached = _getCacheEntry(item.name);
    if (cached) {
      result.set(item.name, { ...item, price: cached.price, priceSource: cached.source });
    } else {
      needsFetch.push(item);
    }
  }

  if (needsFetch.length === 0) {
    console.log(`[PriceEngine] All ${foodItems.length} prices from cache.`);
    return foodItems.map(f => result.get(f.name) || f);
  }

  const names = needsFetch.map(f => f.name);
  console.log(`[PriceEngine] Fetching ${names.length} prices: ${names.join(', ')}`);

  let priceMap = {};
  let source = 'static';

  // Step 2: Try Serper (Tier 1)
  try {
    console.log('[PriceEngine] Tier 1: Serper.dev Google Search...');
    priceMap = await fetchPricesSerper(names);
    const hitCount = Object.keys(priceMap).length;
    console.log(`[PriceEngine] Tier 1 success: ${hitCount}/${names.length} prices from Serper.`);
    source = 'grounded';
  } catch (tier1Err) {
    console.warn(`[PriceEngine] Tier 1 (Serper) failed: ${tier1Err.message}`);

    // Step 3: Try Gemini AI (Tier 2)
    try {
      console.log('[PriceEngine] Tier 2: Gemini AI knowledge...');
      priceMap = await fetchPricesAI(names);
      const hitCount = Object.keys(priceMap).length;
      console.log(`[PriceEngine] Tier 2 success: ${hitCount}/${names.length} prices from AI.`);
      source = 'ai';
    } catch (tier2Err) {
      console.warn(`[PriceEngine] Tier 2 failed: ${tier2Err.message}. Using static prices.`);
    }
  }

  // Step 4: Resolve each item
  for (const item of needsFetch) {
    let price = priceMap[item.name];
    if (!price || price <= 0) {
      const lowerName = item.name.toLowerCase();
      for (const [k, v] of Object.entries(priceMap)) {
        if (k.toLowerCase() === lowerName) { price = v; break; }
      }
    }

    const itemSource = (price && price > 0) ? source : 'static';
    const finalPrice = (price && price > 0) ? price : getStaticPrice(item.name, item.price);

    _setCache(item.name, finalPrice, itemSource);
    result.set(item.name, { ...item, price: finalPrice, priceSource: itemSource });
    console.log(`[PriceEngine] ${item.name}: PKR ${finalPrice} (${itemSource})`);
  }

  return foodItems.map(f => result.get(f.name) || { ...f, priceSource: 'static' });
};

// ─────────────────────────────────────────────────────────────────────────────
// updateMealPlanPrices — updates all slot prices in a plan object
// ─────────────────────────────────────────────────────────────────────────────
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

const updateMealPlanPrices = async (mealPlan) => {
  if (!mealPlan?.days) return mealPlan;

  const foodMap = new Map();
  for (const day of mealPlan.days) {
    for (const mt of MEAL_TYPES) {
      for (const slot of (day[mt] || [])) {
        const food = slot.foodItem;
        if (!food) continue;
        const id = String(food._id || food);
        if (!foodMap.has(id)) {
          foodMap.set(id, { _id: food._id || food, name: food.name || '', price: slot.price || food.price || 50 });
        }
      }
    }
  }

  const uniqueFoods = Array.from(foodMap.values()).filter(f => f.name);
  if (uniqueFoods.length === 0) return mealPlan;

  console.log(`[PriceEngine] Pricing ${uniqueFoods.length} unique food items.`);
  const pricedFoods = await getPricesForFoods(uniqueFoods);

  const priceLookup = new Map();
  for (const f of pricedFoods) priceLookup.set(f.name, { price: f.price, priceSource: f.priceSource });

  const planObj = typeof mealPlan.toObject === 'function'
    ? mealPlan.toObject()
    : JSON.parse(JSON.stringify(mealPlan));

  for (const day of planObj.days) {
    let dayTotal = 0;
    for (const mt of MEAL_TYPES) {
      for (const slot of (day[mt] || [])) {
        const foodName = slot.foodItem?.name;
        if (foodName && priceLookup.has(foodName)) {
          const { price, priceSource } = priceLookup.get(foodName);
          slot.price = price;
          slot.priceSource = priceSource;
        }
        dayTotal += slot.price || 0;
      }
    }
    day.totalCost = parseFloat(dayTotal.toFixed(2));
  }

  planObj.weeklyTotalCost = parseFloat(planObj.days.reduce((s, d) => s + (d.totalCost || 0), 0).toFixed(2));
  planObj.avgDailyCost = parseFloat((planObj.weeklyTotalCost / 7).toFixed(2));

  const sources = pricedFoods.reduce((acc, f) => {
    acc[f.priceSource] = (acc[f.priceSource] || 0) + 1;
    return acc;
  }, {});
  planObj.priceSourceSummary = sources;
  planObj.priceDataSource = Object.entries(sources).sort((a, b) => b[1] - a[1])[0]?.[0] || 'static';

  console.log('[PriceEngine] Price update complete.', sources);
  return planObj;
};

const getSingleItemPrice = async (foodName, fallbackPrice) => {
  const cached = _getCacheEntry(foodName);
  if (cached) return cached.price;
  try {
    const items = await getPricesForFoods([{ name: foodName, price: fallbackPrice }]);
    return items[0]?.price || fallbackPrice;
  } catch {
    return fallbackPrice;
  }
};

const clearPriceCache = () => {
  _priceCache.clear();
  console.log('[PriceEngine] Price cache cleared.');
};

module.exports = { getPricesForFoods, getSingleItemPrice, updateMealPlanPrices, clearPriceCache };
