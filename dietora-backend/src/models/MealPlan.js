// src/models/MealPlan.js
// 7-day AI-generated meal plan
// v4: priceSource per slot + price metadata + clinical analysis

const mongoose = require('mongoose');

// ── Meal slot — one food item in one meal of one day ──────
const mealSlotSchema = new mongoose.Schema(
  {
    foodItem: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodItem', required: true },
    quantity: { type: Number, default: 1 },
    calories: Number,
    protein:  Number,
    carbs:    Number,
    fat:      Number,
    price:    Number, // PKR — set by price engine
    priceSource: {
      type: String,
      enum: ['grounded', 'ai', 'static'],
      default: 'static',
      // grounded = Gemini fetched via live Google Search (most accurate)
      // ai       = Gemini AI knowledge without live search (good fallback)
      // static   = researched static baseline (always available)
    },
  },
  { _id: false }
);

// ── One day's full meal plan ──────────────────────────────
const dayPlanSchema = new mongoose.Schema(
  {
    day:     { type: Number, required: true }, // 1–7
    date:    { type: Date,   required: true }, // real calendar date
    dayName: { type: String },                 // derived from date
    breakfast: [mealSlotSchema],
    lunch:     [mealSlotSchema],
    dinner:    [mealSlotSchema],
    snack:     [mealSlotSchema],
    totalCalories: { type: Number, default: 0 },
    totalProtein:  { type: Number, default: 0 },
    totalCarbs:    { type: Number, default: 0 },
    totalFat:      { type: Number, default: 0 },
    totalCost:     { type: Number, default: 0 }, // PKR
  },
  { _id: false }
);

// ── Phase 1 clinical analysis sub-document ────────────────
const clinicalAnalysisSchema = new mongoose.Schema(
  {
    conditionSeverity: {
      diabetes:     { type: String, default: 'none' },
      hypertension: { type: String, default: 'none' },
      cardiac:      { type: String, default: 'none' },
      kidney:       { type: String, default: 'none' },
      thyroid:      { type: String, default: 'none' },
    },
    dailyNutrientTargets: {
      calories:     Number,
      proteinGrams: Number,
      carbsGrams:   Number,
      fatGrams:     Number,
      sodiumMg:     Number,
      fiberGrams:   Number,
    },
    dietaryPriorities:          [String],
    foodsToEmphasise:           [String],
    foodsToAvoid:               [String],
    mealTimingAdvice:           String,
    clinicalRationale:          String,
    planAdjustmentFromFeedback: String,
  },
  { _id: false }
);

// ── Root meal plan document ───────────────────────────────
const mealPlanSchema = new mongoose.Schema(
  {
    user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User',          required: true },
    healthProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthProfile' },
    title:         { type: String, default: '7-Day DIETORA Meal Plan' },
    planConfig: {
      dailyCalorieTarget: Number,
      dailyBudget:        Number,
      goal:               String,
      isDiabetic:         Boolean,
      isHypertensive:     Boolean,
      isCardiac:          Boolean,
      hasKidneyDisease:   Boolean,
      hasThyroid:         Boolean,
      allergies:          [String],
    },
    // Phase 1 AI clinical analysis — stored for frontend display
    clinicalAnalysis: { type: clinicalAnalysisSchema, default: null },
    days: [dayPlanSchema], // exactly 7 elements
    weeklyTotalCalories: { type: Number, default: 0 },
    weeklyTotalCost:     { type: Number, default: 0 }, // PKR
    avgDailyCalories:    { type: Number, default: 0 },
    avgDailyCost:        { type: Number, default: 0 }, // PKR
    // Price metadata — set by priceUpdater after generation
    priceDataSource: {
      type: String,
      enum: ['grounded', 'ai', 'static'],
      default: 'static',
    },
    priceSourceSummary: {
      grounded: { type: Number, default: 0 },
      ai:       { type: Number, default: 0 },
      static:   { type: Number, default: 0 },
    },
    priceLastUpdated: { type: Date, default: null },
    priceStatus: {
      type: String,
      enum: ['updating', 'ready'],
      default: 'ready',
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'draft'],
      default: 'active',
    },
    startDate: { type: Date, default: Date.now },
    endDate:   { type: Date },
    aiUsed:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Pre-save: set endDate = startDate + 6 days
mealPlanSchema.pre('save', function (next) {
  if (this.startDate && !this.endDate) {
    const end = new Date(this.startDate);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    this.endDate = end;
  }
  next();
});

module.exports = mongoose.model('MealPlan', mealPlanSchema);
