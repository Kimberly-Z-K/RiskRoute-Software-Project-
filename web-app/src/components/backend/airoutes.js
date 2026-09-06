const express = require("express");

const {
  analyzeRoute,
  askRouteQuestion
} = require("./aiService");

const {
  getSimulations
} = require("./simulationStore");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| POST /api/ai/analyze
|--------------------------------------------------------------------------
*/

router.post("/analyze", async (req, res) => {
  try {
    const {
      route,
      simulation,
      weather,
      traffic
    } = req.body;

    if (!route) {
      return res.status(400).json({
        success: false,
        error: "Route information is required."
      });
    }

    if (!simulation) {
      return res.status(400).json({
        success: false,
        error: "Simulation information is required."
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Historical simulations come from the backend
    |--------------------------------------------------------------------------
    */

    const historicalSimulations =
      getSimulations();

    const analysis =
      await analyzeRoute({
        route,
        simulation,
        weather,
        traffic,
        historicalSimulations
      });

    return res.json({
      success: true,

      analysis,

      historical: {
        count:
          historicalSimulations.length
      }
    });
  } catch (error) {
    console.error(
      "AI analyze route error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "AI analysis failed.",
      message: error.message
    });
  }
});

/*
|--------------------------------------------------------------------------
| POST /api/ai/ask
|--------------------------------------------------------------------------
*/

router.post("/ask", async (req, res) => {
  try {
    const {
      question,
      route,
      simulation,
      weather,
      traffic
    } = req.body;

    if (!question?.trim()) {
      return res.status(400).json({
        success: false,
        error: "Question is required."
      });
    }

    const historicalSimulations =
      getSimulations();

    const result =
      await askRouteQuestion({
        question: question.trim(),
        route,
        simulation,
        weather,
        traffic,
        historicalSimulations
      });

    return res.json({
      success: true,
      answer: result.answer
    });
  } catch (error) {
    console.error(
      "AI Ask error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Ask AI failed.",
      message: error.message
    });
  }
});

module.exports = router;