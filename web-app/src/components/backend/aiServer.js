require("dotenv").config();

const express = require("express");
const cors = require("cors");

const {
  runSimulation,
  getAvailableRoutes,
  getWeatherOptions
} = require("./simulationService");

const {
  getSimulations,
  createSimulation,
  deleteSimulation
} = require("./simulationStore");

const aiRoutes = require("./airoutes");

const app = express();

const PORT =
  process.env.PORT || 5050;

/*
|--------------------------------------------------------------------------
| Middleware
|--------------------------------------------------------------------------
*/

// Explicit allow-list. Update with your deployed frontend URL when you
// push to production, e.g. "https://riskroute.vercel.app".
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://127.0.0.1:5173"
];

app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server / curl (no Origin header)
      if (!origin) return callback(null, true);

      if (
        ALLOWED_ORIGINS.includes(origin) ||
        process.env.NODE_ENV !== "production"
      ) {
        return callback(null, true);
      }

      return callback(
        new Error(`CORS blocked for origin: ${origin}`)
      );
    },
    credentials: true
  })
);

app.use(
  express.json({
    limit: "2mb"
  })
);

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      success: true,
      message:
        "RiskRoute backend is running.",

      aiConfigured:
        Boolean(
          process.env.GROQ_API_KEY
        ),

      aiProvider: "groq",

      model:
        process.env.AI_MODEL ||
        "openai/gpt-oss-120b"
    });
  }
);

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
*/

app.get(
  "/api/routes",
  (req, res) => {
    res.json(
      getAvailableRoutes()
    );
  }
);

/*
|--------------------------------------------------------------------------
| Weather options
|--------------------------------------------------------------------------
*/

app.get(
  "/api/weather/options",
  (req, res) => {
    res.json(
      getWeatherOptions()
    );
  }
);

/*
|--------------------------------------------------------------------------
| Run simulation
|--------------------------------------------------------------------------
*/

app.post(
  "/api/simulations/run",
  (req, res) => {
    try {
      const {
        routeId,
        delayMinutes,
        weather,
        accident,
        roadClosure
      } = req.body;

      if (!routeId) {
        return res.status(400).json({
          success: false,
          error:
            "routeId is required."
        });
      }

      const result =
        runSimulation({
          routeId,
          delayMinutes,
          weather,
          accident,
          roadClosure
        });

      return res.json({
        success: true,
        result
      });
    } catch (error) {
      console.error(
        "Simulation error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "Simulation failed.",
        message:
          error.message
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Get saved simulations
|--------------------------------------------------------------------------
*/

app.get(
  "/api/simulations",
  (req, res) => {
    try {
      const simulations =
        getSimulations();

      res.json(simulations);
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          "Failed to load simulations."
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Save simulation
|--------------------------------------------------------------------------
*/

app.post(
  "/api/simulations",
  (req, res) => {
    try {
      const saved =
        createSimulation(
          req.body
        );

      res.status(201).json(
        saved
      );
    } catch (error) {
      console.error(
        "Save simulation error:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          "Failed to save simulation."
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Delete simulation
|--------------------------------------------------------------------------
*/

app.delete(
  "/api/simulations/:id",
  (req, res) => {
    try {
      deleteSimulation(
        req.params.id
      );

      res.json({
        success: true
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          "Failed to delete simulation."
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| AI
|--------------------------------------------------------------------------
*/

app.use(
  "/api/ai",
  aiRoutes
);

/*
|--------------------------------------------------------------------------
| 404
|--------------------------------------------------------------------------
*/

app.use(
  (req, res) => {
    res.status(404).json({
      success: false,
      error:
        `Endpoint ${req.method} ${req.originalUrl} was not found.`
    });
  }
);

/*
|--------------------------------------------------------------------------
| Start
|--------------------------------------------------------------------------
*/

app.listen(
  PORT,
  () => {
    console.log(
      "======================================"
    );

    console.log(
      "🚛 RiskRoute Backend"
    );

    console.log(
      `🚀 Server: http://localhost:${PORT}`
    );

    console.log(
      `🧠 AI Provider: Groq`
    );

    console.log(
      `🧠 AI Model: ${
        process.env.AI_MODEL ||
        "openai/gpt-oss-120b"
      }`
    );

    console.log(
      `🔑 Groq configured: ${
        process.env.GROQ_API_KEY
          ? "YES"
          : "NO"
      }`
    );

    console.log(
      "======================================"
    );
  }
);