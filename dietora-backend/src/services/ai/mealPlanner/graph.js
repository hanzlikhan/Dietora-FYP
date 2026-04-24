// src/services/ai/mealPlanner/graph.js
// DIETORA — LangGraph Workflow (Optimized: 2 nodes instead of 4)

'use strict';

const { StateGraph, END } = require("@langchain/langgraph");
const { MealPlannerState } = require("./state");
const { filterFoodsNode, generateMealPlanNode, validatePlanNode } = require("./nodes");

const buildMealPlannerGraph = () => {
  const workflow = new StateGraph(MealPlannerState)
    .addNode("filter_foods", filterFoodsNode)
    .addNode("generate_plan", generateMealPlanNode)
    .addNode("validate_plan", validatePlanNode)

    // Entry → Filter (pure JS, instant) → Generate (1 AI call) → Validate
    .addEdge("__start__", "filter_foods")
    .addEdge("filter_foods", "generate_plan")
    .addEdge("generate_plan", "validate_plan")

    // Conditional: success → done | retry (max 2) → regenerate | max_retries → done
    .addConditionalEdges(
      "validate_plan",
      (state) => {
        if (!state.validationErrors || state.validationErrors.length === 0) return "success";
        if (state.generationAttempts >= 2) {
          console.warn("[LangGraph] Max 2 retries reached. Exiting with best-effort plan.");
          return "max_retries";
        }
        return "retry";
      },
      {
        success:     END,
        max_retries: END,
        retry:       "generate_plan",
      }
    );

  return workflow.compile();
};

module.exports = { buildMealPlannerGraph };
