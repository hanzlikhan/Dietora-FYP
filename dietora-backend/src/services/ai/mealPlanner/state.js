// src/services/ai/mealPlanner/state.js
const { Annotation } = require("@langchain/langgraph");

// Define the state schema for our Meal Planner Agent
const MealPlannerState = Annotation.Root({
  // Inputs
  profile: Annotation(),
  checkInFeedback: Annotation(),
  availableFoods: Annotation(),
  startDate: Annotation(),
  
  // Intermediates
  clinicalAnalysis: Annotation(),
  draftPlanRaw: Annotation(),
  draftPlanParsed: Annotation(),
  validationErrors: Annotation({
    reducer: (curr, update) => update // always overwrite with latest validation errors
  }),
  generationAttempts: Annotation({
    reducer: (_, update) => update, // replace — nodes.js already increments correctly
    default: () => 0
  }),
  
  // Output
  finalPlan: Annotation()
});

module.exports = { MealPlannerState };
