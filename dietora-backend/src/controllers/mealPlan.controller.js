// src/controllers/mealPlan.controller.js
// DIETORA — Meal Plan Controller (Optimized: background price update)

'use strict';

const MealPlan       = require('../models/MealPlan');
const HealthProfile  = require('../models/HealthProfile');
const WeeklyProgress = require('../models/WeeklyProgress');
const FoodItem       = require('../models/FoodItem');
const { generateMealPlan }     = require('../services/mealPlanner.service');
const { updateMealPlanPrices } = require('../services/priceUpdater.service');
const { generateTailoredRecipe } = require('../services/ai/recipeGenerator');
const { successResponse, paginatedResponse } = require('../utils/response.utils');

const POPULATE_MEALS = 'days.breakfast.foodItem days.lunch.foodItem days.dinner.foodItem days.snack.foodItem';
const DAY_NAMES  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

// ─── Helper: auto-init weekly progress tracker ────────────
const initProgressForPlan = async (userId, mealPlanId) => {
  try {
    const existing = await WeeklyProgress.findOne({ user: userId, mealPlan: mealPlanId });
    if (existing) return existing;
    const count = await WeeklyProgress.countDocuments({ user: userId });
    return await WeeklyProgress.create({
      user:       userId,
      mealPlan:   mealPlanId,
      weekNumber: count + 1,
      days: Array.from({ length: 7 }, (_, i) => ({
        day:     i + 1,
        dayName: DAY_NAMES[i],
        meals:   MEAL_TYPES.map(mt => ({ mealType: mt, completed: false, completedAt: null })),
        allCompleted:     false,
        caloriesConsumed: 0,
        costSpent:        0,
      })),
    });
  } catch (err) {
    console.warn('[MealPlan] Could not auto-init progress:', err.message);
    return null;
  }
};

// ─── Background price update (fire-and-forget) ───────────
// This runs AFTER we've already responded to the client, so it doesn't
// slow down the initial response. Prices start as static DB values and
// upgrade to live Serper prices within ~5-10 seconds in the background.
const runBackgroundPriceUpdate = async (mealPlanId) => {
  try {
    console.log(`[MealPlan] Background price update starting for plan ${mealPlanId}...`);
    const plan = await MealPlan.findById(mealPlanId).populate(POPULATE_MEALS);
    if (!plan) return;

    const updatedPlan = await updateMealPlanPrices(plan);

    await MealPlan.findByIdAndUpdate(mealPlanId, {
      days:               updatedPlan.days,
      weeklyTotalCost:    updatedPlan.weeklyTotalCost,
      avgDailyCost:       updatedPlan.avgDailyCost,
      priceDataSource:    updatedPlan.priceDataSource    || 'static',
      priceSourceSummary: updatedPlan.priceSourceSummary || {},
      priceLastUpdated:   new Date(),
      priceStatus:        'ready',
    });
    console.log(`[MealPlan] Background price update COMPLETE for plan ${mealPlanId}. Source: ${updatedPlan.priceDataSource}`);
  } catch (err) {
    console.error('[MealPlan] Background price update failed:', err.message);
    // Mark as ready anyway so client knows update finished (even if static)
    await MealPlan.findByIdAndUpdate(mealPlanId, { priceStatus: 'ready' }).catch(() => {});
  }
};

/**
 * POST /api/v1/meal-plans/generate
 * Returns plan immediately with static prices.
 * Prices update to live Serper values in background (~5-10s).
 */
const generate = async (req, res, next) => {
  try {
    const profile = await HealthProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(400).json({
        success: false,
        message: 'Please create your health profile first before generating a meal plan.',
      });
    }

    // Archive any existing active plan
    await MealPlan.updateMany({ user: req.user._id, status: 'active' }, { status: 'archived' });

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    // ── Phase 1: AI meal selection (single Gemini call) ──────
    const planData = await generateMealPlan(profile, startDate);

    const startLabel = startDate.toLocaleDateString('en-PK', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });

    // ── Save plan with static prices ─────────────────────────
    const mealPlan = await MealPlan.create({
      user:          req.user._id,
      healthProfile: profile._id,
      title:         `7-Day Plan starting ${startLabel}`,
      startDate,
      priceStatus:   'updating', // will become 'ready' after background update
      priceDataSource: 'static',
      ...planData,
    });

    // Populate food item details for the response
    const populated = await MealPlan.findById(mealPlan._id).populate(POPULATE_MEALS);

    // ── Auto-init weekly progress tracker ────────────────────
    const progress = await initProgressForPlan(req.user._id, mealPlan._id);

    // ── FIRE-AND-FORGET: background price update ─────────────
    // We do NOT await this — it runs after we respond to the client.
    // The client can poll GET /meal-plans/:id/prices to check status.
    setImmediate(() => runBackgroundPriceUpdate(mealPlan._id.toString()));

    return successResponse(
      res,
      { mealPlan: populated, progressId: progress?._id, priceStatus: 'updating' },
      '7-day meal plan generated! Live prices updating in background 🎉',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/meal-plans/:id/prices
 * Poll this endpoint to check if background price update is complete.
 */
const getPriceStatus = async (req, res, next) => {
  try {
    const plan = await MealPlan.findOne({ _id: req.params.id, user: req.user._id })
      .select('priceStatus priceDataSource priceSourceSummary priceLastUpdated weeklyTotalCost avgDailyCost days')
      .populate(POPULATE_MEALS);

    if (!plan) return res.status(404).json({ success: false, message: 'Meal plan not found.' });

    return successResponse(res, {
      priceStatus:        plan.priceStatus || 'ready',
      priceDataSource:    plan.priceDataSource,
      priceSourceSummary: plan.priceSourceSummary,
      priceLastUpdated:   plan.priceLastUpdated,
      weeklyTotalCost:    plan.weeklyTotalCost,
      avgDailyCost:       plan.avgDailyCost,
      days:               plan.days,
    }, 'Price status fetched');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/meal-plans
 */
const getAll = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;
    const filter = { user: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const [plans, total] = await Promise.all([
      MealPlan.find(filter).select('-days').sort({ createdAt: -1 }).skip(skip).limit(limit),
      MealPlan.countDocuments(filter),
    ]);

    return paginatedResponse(res, plans, total, page, limit, 'Meal plans fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/meal-plans/active
 */
const getActive = async (req, res, next) => {
  try {
    const plan = await MealPlan.findOne({ user: req.user._id, status: 'active' })
      .populate(POPULATE_MEALS);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'No active meal plan found. Generate one at POST /meal-plans/generate',
      });
    }

    const progress = await WeeklyProgress.findOne({ user: req.user._id, mealPlan: plan._id });
    return successResponse(res, { mealPlan: plan, progress: progress || null }, 'Active meal plan fetched');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/meal-plans/:id
 */
const getById = async (req, res, next) => {
  try {
    const plan = await MealPlan.findOne({ _id: req.params.id, user: req.user._id })
      .populate(POPULATE_MEALS);
    if (!plan) return res.status(404).json({ success: false, message: 'Meal plan not found.' });
    return successResponse(res, plan, 'Meal plan fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/meal-plans/:id/day/:dayNumber
 */
const getDayPlan = async (req, res, next) => {
  try {
    const plan = await MealPlan.findOne({ _id: req.params.id, user: req.user._id })
      .populate(POPULATE_MEALS);
    if (!plan) return res.status(404).json({ success: false, message: 'Meal plan not found.' });

    const day = plan.days.find(d => d.day === parseInt(req.params.dayNumber));
    if (!day) return res.status(404).json({ success: false, message: `Day ${req.params.dayNumber} not found.` });

    return successResponse(res, day, `Day ${req.params.dayNumber} plan fetched`);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/meal-plans/:id
 */
const archivePlan = async (req, res, next) => {
  try {
    const plan = await MealPlan.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { status: 'archived' },
      { new: true }
    );
    if (!plan) return res.status(404).json({ success: false, message: 'Meal plan not found.' });
    return successResponse(res, {}, 'Meal plan archived successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/meal-plans/:id/alternatives
 */
const getAlternatives = async (req, res, next) => {
  try {
    const { day, meal } = req.query;
    if (!meal) return res.status(400).json({ success: false, message: 'Query param "meal" is required.' });

    const plan = await MealPlan.findOne({ _id: req.params.id, user: req.user._id });
    if (!plan) return res.status(404).json({ success: false, message: 'Meal plan not found.' });

    const filter = { isAvailable: true, mealType: meal };
    if (plan.planConfig?.isDiabetic)       filter.is_diabetic_safe     = true;
    if (plan.planConfig?.isHypertensive)   filter.is_hypertension_safe = true;
    if (plan.planConfig?.isCardiac)        filter.is_cardiac_safe      = true;
    if (plan.planConfig?.hasKidneyDisease) filter.is_kidney_safe       = true;
    if (plan.planConfig?.hasThyroid)       filter.is_thyroid_safe      = true;

    let foods = await FoodItem.find(filter).lean();

    const allergyLower = (plan.planConfig?.allergies || []).map(a => a.toLowerCase());
    foods = foods.filter(f => !f.allergens?.some(a => allergyLower.includes(a.toLowerCase())));

    const budgetMap = { breakfast: 0.25, lunch: 0.35, dinner: 0.30, snack: 0.10 };
    const maxBudget = (plan.planConfig?.dailyBudget || 500) * (budgetMap[meal] || 0.25);

    let affordable = foods.filter(f => f.price <= maxBudget);
    if (affordable.length === 0) affordable = foods;
    affordable.sort((a, b) => (b.calories / (b.price || 1)) - (a.calories / (a.price || 1)));

    return successResponse(res, affordable.slice(0, 3), 'Alternatives fetched');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/meal-plans/:id/swap
 */
const swapMeal = async (req, res, next) => {
  try {
    const { day, meal, foodItemId } = req.body;
    const plan = await MealPlan.findOne({ _id: req.params.id, user: req.user._id });
    if (!plan) return res.status(404).json({ success: false, message: 'Meal plan not found.' });

    const food = await FoodItem.findById(foodItemId).lean();
    if (!food) return res.status(404).json({ success: false, message: 'Food item not found.' });

    const dayIndex = plan.days.findIndex(d => d.day === parseInt(day));
    if (dayIndex === -1) return res.status(404).json({ success: false, message: 'Day not found.' });

    plan.days[dayIndex][meal] = [{
      foodItem:    food._id,
      quantity:    1,
      calories:    food.calories,
      protein:     food.protein,
      carbs:       food.carbs,
      fat:         food.fat,
      price:       food.price,
      priceSource: 'static',
    }];

    const dayData = plan.days[dayIndex];
    const allSlots = [...dayData.breakfast, ...dayData.lunch, ...dayData.dinner, ...dayData.snack];
    dayData.totalCalories = Math.round(allSlots.reduce((s, m) => s + m.calories, 0));
    dayData.totalProtein  = parseFloat(allSlots.reduce((s, m) => s + m.protein, 0).toFixed(1));
    dayData.totalCarbs    = parseFloat(allSlots.reduce((s, m) => s + m.carbs,   0).toFixed(1));
    dayData.totalFat      = parseFloat(allSlots.reduce((s, m) => s + m.fat,     0).toFixed(1));
    dayData.totalCost     = parseFloat(allSlots.reduce((s, m) => s + m.price,   0).toFixed(2));

    plan.weeklyTotalCalories = Math.round(plan.days.reduce((s, d) => s + d.totalCalories, 0));
    plan.weeklyTotalCost     = parseFloat(plan.days.reduce((s, d) => s + d.totalCost, 0).toFixed(2));
    plan.avgDailyCalories    = Math.round(plan.weeklyTotalCalories / 7);
    plan.avgDailyCost        = parseFloat((plan.weeklyTotalCost / 7).toFixed(2));

    await plan.save();
    const populated = await MealPlan.findById(plan._id).populate(POPULATE_MEALS);
    return successResponse(res, populated, 'Meal swapped successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/meal-plans/recipe/:foodId
 */
const getRecipe = async (req, res, next) => {
  try {
    const food = await FoodItem.findById(req.params.foodId).lean();
    if (!food) return res.status(404).json({ success: false, message: 'Food item not found.' });

    const profile = await HealthProfile.findOne({ user: req.user._id }).lean();
    if (!profile) return res.status(400).json({ success: false, message: 'Health profile not found.' });

    const recipe = await generateTailoredRecipe(food.name, profile);
    return successResponse(res, recipe, 'Recipe generated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = { generate, getAll, getActive, getById, getDayPlan, archivePlan, getAlternatives, swapMeal, getRecipe, getPriceStatus };
