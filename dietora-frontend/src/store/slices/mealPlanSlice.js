// src/store/slices/mealPlanSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'
import toast from 'react-hot-toast'

// ─── Thunks ───────────────────────────────────────────────

export const generateMealPlan = createAsyncThunk('mealPlan/generate', async (params, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/meal-plans/generate', params || {})
    return data
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to generate meal plan'
    return rejectWithValue(msg)
  }
})

export const fetchMealPlans = createAsyncThunk('mealPlan/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/meal-plans?limit=10')
    return data
  } catch (err) {
    if (err.response?.status === 404) return { data: [] }
    return rejectWithValue(err.response?.data?.message)
  }
})

export const fetchActivePlan = createAsyncThunk('mealPlan/fetchActive', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/meal-plans/active')
    return data
  } catch (err) {
    if (err.response?.status === 404) return null
    return rejectWithValue(err.response?.data?.message)
  }
})

export const fetchMealPlanById = createAsyncThunk('mealPlan/fetchById', async (id, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/meal-plans/${id}`)
    return data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message)
  }
})

export const fetchAlternatives = createAsyncThunk('mealPlan/alternatives', async ({ planId, day, meal }, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/meal-plans/${planId}/alternatives?day=${day}&meal=${meal}`)
    // successResponse wraps in data.data — extract array safely
    const result = data?.data || data
    return Array.isArray(result) ? result : []
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch alternatives')
  }
})

export const swapMeal = createAsyncThunk('mealPlan/swap', async ({ planId, day, meal, foodItemId }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch(`/meal-plans/${planId}/swap`, { day, meal, foodItemId })
    return data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to swap meal')
  }
})

function normalizePlan(plan) {
  if (!plan) return null

  const normalizedDays = (plan.days || []).map((day) => {
    const meals = {}
    ;['breakfast', 'lunch', 'dinner', 'snack'].forEach((mealType) => {
      const slot = day[mealType]?.[0]
      if (slot) {
        const food = slot.foodItem || {}
        meals[mealType] = {
          foodId:               food._id || food.id         || null,
          name:                 food.name                   || 'Unknown',
          calories:             slot.calories               || food.calories  || 0,
          protein:              slot.protein                || food.protein   || 0,
          carbs:                slot.carbs                  || food.carbs     || 0,
          fat:                  slot.fat                    || food.fat       || 0,
          price:                slot.price                  || food.price     || 0,
          priceSource:          slot.priceSource            || 'static',
          category:             food.category               || '',
          is_diabetic_safe:     food.is_diabetic_safe       || false,
          is_hypertension_safe: food.is_hypertension_safe   || false,
          is_cardiac_safe:      food.is_cardiac_safe        || false,
          is_kidney_safe:       food.is_kidney_safe         || false,
          is_thyroid_safe:      food.is_thyroid_safe        || false,
        }
      }
    })
    return {
      day:           day.day,
      date:          day.date    || null,
      dayName:       day.dayName || `Day ${day.day}`,
      meals,
      totalCalories: day.totalCalories || 0,
      totalProtein:  day.totalProtein  || 0,
      totalCarbs:    day.totalCarbs    || 0,
      totalFat:      day.totalFat      || 0,
      totalCost:     day.totalCost     || 0,
    }
  })

  return {
    ...plan,
    days:              normalizedDays,
    totalCost:         plan.weeklyTotalCost     || plan.totalCost     || 0,
    totalCalories:     plan.weeklyTotalCalories || plan.totalCalories || 0,
    weeklyTotalCost:   plan.weeklyTotalCost     || plan.totalCost     || 0,
    avgDailyCost:      plan.avgDailyCost        || 0,
    avgDailyCalories:  plan.avgDailyCalories    || 0,
    priceDataSource:    plan.priceDataSource    || 'static',
    priceSourceSummary: plan.priceSourceSummary || { grounded: 0, ai: 0, static: 0 },
    priceLastUpdated:   plan.priceLastUpdated   || null,
    priceStatus:        plan.priceStatus        || 'ready',
  }
}

// ─── Slice ────────────────────────────────────────────────
const initialState = {
  current:     null,
  list:        [],
  loading:     false,
  generating:  false,
  error:       null,
  selectedDay: 0,
  progressId:  null,
}

const mealPlanSlice = createSlice({
  name: 'mealPlan',
  initialState,
  reducers: {
    setSelectedDay(state, action) { state.selectedDay = action.payload },
    clearCurrent(state)           { state.current = null },
    clearError(state)             { state.error   = null },
    resetState()                  { return initialState },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateMealPlan.pending,   (state)         => { state.generating = true; state.error = null })
      .addCase(generateMealPlan.rejected,  (state, action) => {
        state.generating = false
        state.error = action.payload
        toast.error(action.payload || 'Failed to generate plan')
      })
      .addCase(generateMealPlan.fulfilled, (state, action) => {
        state.generating = false
        const raw     = action.payload?.data || action.payload
        const rawPlan = raw?.mealPlan || raw
        state.progressId = raw?.progressId || null
        state.current    = normalizePlan(rawPlan)
        if (state.current) state.list = [state.current, ...state.list.slice(0, 9)]
        state.selectedDay = 0
        // Prices start as static and update in background — always show this message
        toast.success('✅ Plan generated! Live prices loading in background...')
      })
      .addCase(fetchMealPlans.pending,     (state)         => { state.loading = true })
      .addCase(fetchMealPlans.fulfilled,   (state, action) => {
        state.loading = false
        const raw = action.payload?.data || []
        state.list = Array.isArray(raw) ? raw.map(normalizePlan).filter(Boolean) : []
      })
      .addCase(fetchMealPlans.rejected,    (state)         => { state.loading = false })
      .addCase(fetchActivePlan.fulfilled,  (state, action) => {
        if (!action.payload) return
        const raw     = action.payload?.data || action.payload
        const rawPlan = raw?.mealPlan || raw
        if (rawPlan?._id) state.current = normalizePlan(rawPlan)
      })
      .addCase(fetchMealPlanById.pending,  (state)         => { state.loading = true })
      .addCase(fetchMealPlanById.fulfilled,(state, action) => {
        state.loading = false
        const raw = action.payload?.data || action.payload
        state.current = normalizePlan(raw?.mealPlan || raw)
      })
      .addCase(fetchMealPlanById.rejected, (state)         => { state.loading = false })
      .addCase(swapMeal.fulfilled, (state, action) => {
        const raw = action.payload?.data || action.payload
        state.current = normalizePlan(raw?.mealPlan || raw)
        toast.success('Meal swapped successfully!')
      })
  },
})

export const { setSelectedDay, clearCurrent, clearError, resetState: resetMealPlan } = mealPlanSlice.actions
export default mealPlanSlice.reducer
