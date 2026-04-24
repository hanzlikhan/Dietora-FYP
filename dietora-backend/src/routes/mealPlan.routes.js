// src/routes/mealPlan.routes.js

const express = require('express');
const router = express.Router();
const {
  generate, getAll, getActive, getById, getDayPlan, archivePlan,
  getAlternatives, swapMeal, getRecipe, getPriceStatus
} = require('../controllers/mealPlan.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

// @route POST /api/v1/meal-plans/generate
router.post('/generate', generate);

// @route GET /api/v1/meal-plans/active
router.get('/active', getActive);

// @route GET /api/v1/meal-plans
router.get('/', getAll);

// @route GET /api/v1/meal-plans/recipe/:foodId
router.get('/recipe/:foodId', getRecipe);

// @route GET /api/v1/meal-plans/:id/prices  (poll for live price update status)
router.get('/:id/prices', getPriceStatus);

// @route GET /api/v1/meal-plans/:id/alternatives
router.get('/:id/alternatives', getAlternatives);

// @route PATCH /api/v1/meal-plans/:id/swap
router.patch('/:id/swap', swapMeal);

// @route GET /api/v1/meal-plans/:id
router.get('/:id', getById);

// @route GET /api/v1/meal-plans/:id/day/:dayNumber
router.get('/:id/day/:dayNumber', getDayPlan);

// @route DELETE /api/v1/meal-plans/:id
router.delete('/:id', archivePlan);

module.exports = router;
