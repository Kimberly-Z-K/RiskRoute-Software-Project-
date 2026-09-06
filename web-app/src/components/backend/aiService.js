const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MODEL =
  process.env.OPENAI_MODEL || "gpt-5.6-luna";

const analysisSchema = {
  type: "object",
  additionalProperties: false,

  properties: {
    summary: {
      type: "string"
    },

    decision: {
      type: "string",
      enum: [
        "PROCEED",
        "PROCEED_WITH_CAUTION",
        "CONSIDER_ALTERNATIVE",
        "AVOID_ROUTE"
      ]
    },

    riskLevel: {
      type: "string",
      enum: [
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL"
      ]
    },

    riskScore: {
      type: "number",
      minimum: 0,
      maximum: 100
    },

    confidence: {
      type: "number",
      minimum: 0,
      maximum: 100
    },

    recommendations: {
      type: "array",
      items: {
        type: "string"
      }
    },

    riskFactors: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,

        properties: {
          factor: {
            type: "string"
          },

          impact: {
            type: "string",
            enum: [
              "LOW",
              "MEDIUM",
              "HIGH",
              "CRITICAL"
            ]
          },

          explanation: {
            type: "string"
          }
        },

        required: [
          "factor",
          "impact",
          "explanation"
        ]
      }
    },

    historicalEvidence: {
      type: "string"
    }
  },

  required: [
    "summary",
    "decision",
    "riskLevel",
    "riskScore",
    "confidence",
    "recommendations",
    "riskFactors",
    "historicalEvidence"
  ]
};

function calculateHistoricalStatistics(
  simulations
) {
  const valid = simulations.filter(
    (item) =>
      Number.isFinite(
        Number(
          item?.result?.current?.riskScore
        )
      )
  );

  if (valid.length === 0) {
    return {
      count: 0,
      averageRisk: null,
      averageDelay: null,
      highRiskCount: 0
    };
  }

  const totalRisk = valid.reduce(
    (sum, item) =>
      sum +
      Number(
        item.result.current.riskScore
      ),
    0
  );

  const totalDelay = valid.reduce(
    (sum, item) =>
      sum +
      Number(
        item.result.current.delayMinutes || 0
      ),
    0
  );

  const highRiskCount = valid.filter(
    (item) =>
      Number(
        item.result.current.riskScore
      ) >= 70
  ).length;

  return {
    count: valid.length,

    averageRisk: Math.round(
      totalRisk / valid.length
    ),

    averageDelay: Math.round(
      totalDelay / valid.length
    ),

    highRiskCount
  };
}

function calculateEvidenceCap(
  current,
  history
) {
  let cap = 55;

  if (
    current?.simulation?.riskScore !==
    undefined
  ) {
    cap += 10;
  }

  if (
    current?.simulation?.weather
  ) {
    cap += 5;
  }

  if (
    current?.simulation?.delayMinutes !==
    undefined
  ) {
    cap += 5;
  }

  if (
    current?.simulation?.accident !==
    undefined
  ) {
    cap += 5;
  }

  if (
    current?.simulation?.roadClosure !==
    undefined
  ) {
    cap += 5;
  }

  if (history >= 5) cap += 5;
  if (history >= 15) cap += 5;

  return Math.min(95, cap);
}

function fallbackAnalysis(
  route,
  simulation,
  historyStats
) {
  const score = Math.max(
    0,
    Math.min(
      100,
      Number(simulation?.riskScore || 0)
    )
  );

  let level = "LOW";
  let decision = "PROCEED";

  if (score >= 85) {
    level = "CRITICAL";
    decision = "AVOID_ROUTE";
  } else if (score >= 70) {
    level = "HIGH";
    decision = "CONSIDER_ALTERNATIVE";
  } else if (score >= 40) {
    level = "MEDIUM";
    decision = "PROCEED_WITH_CAUTION";
  }

  const riskFactors = [];

  if (
    String(
      simulation?.weather || ""
    ).toLowerCase().includes("rain")
  ) {
    riskFactors.push({
      factor: simulation.weather,
      impact:
        String(simulation.weather)
          .toLowerCase()
          .includes("heavy")
          ? "HIGH"
          : "MEDIUM",
      explanation:
        "Rain can reduce visibility and road grip."
    });
  }

  if (simulation?.accident) {
    riskFactors.push({
      factor: "Accident",
      impact: "HIGH",
      explanation:
        "The simulated accident may increase congestion and operational exposure."
    });
  }

  if (simulation?.roadClosure) {
    riskFactors.push({
      factor: "Road closure",
      impact: "CRITICAL",
      explanation:
        "The simulated closure can prevent normal route continuation."
    });
  }

  if (
    Number(
      simulation?.delayMinutes || 0
    ) > 30
  ) {
    riskFactors.push({
      factor: "Traffic delay",
      impact: "MEDIUM",
      explanation:
        "The simulated delay increases journey time."
    });
  }

  return {
    summary:
      `The simulation for ${route?.name || "the route"} ` +
      `has a ${level.toLowerCase()} risk level ` +
      `based on the supplied simulation conditions.`,

    decision,

    riskLevel: level,

    riskScore: score,

    confidence:
      historyStats.count >= 10 ? 75 : 60,

    recommendations: [
      decision === "AVOID_ROUTE"
        ? "Use an alternative route."
        : decision === "CONSIDER_ALTERNATIVE"
        ? "Compare available alternative routes."
        : "Continue monitoring route conditions.",
      Number(
        simulation?.delayMinutes || 0
      ) > 0
        ? "Allow additional travel time."
        : "No additional delay has been simulated."
    ],

    riskFactors,

    historicalEvidence:
      historyStats.count > 0
        ? `${historyStats.count} historical simulations were available. Average historical risk was ${historyStats.averageRisk}/100 and average delay was ${historyStats.averageDelay} minutes.`
        : "No historical simulations are available yet."
  };
}

async function analyzeRoute({
  route,
  simulation,
  weather,
  traffic,
  historicalSimulations
}) {
  const historicalStats =
    calculateHistoricalStatistics(
      historicalSimulations
    );

  const evidence = {
    currentRoute: route,

    currentSimulation: {
      ...simulation
    },

    weather: weather || null,

    traffic: traffic || null,

    historicalStatistics:
      historicalStats,

    historicalSimulations:
      historicalSimulations
        .slice(0, 30)
        .map((item) => ({
          routeName:
            item.routeName || "Unknown",

          riskScore:
            item?.result?.current
              ?.riskScore ?? null,

          delayMinutes:
            item?.result?.current
              ?.delayMinutes ?? null,

          weather:
            item?.result?.parameters
              ?.weatherLabel ??
            item?.weather ??
            null,

          accident:
            item?.result?.parameters
              ?.accident ?? false,

          roadClosure:
            item?.result?.parameters
              ?.roadClosure ?? false
        }))
  };

  if (!process.env.OPENAI_API_KEY) {
    return fallbackAnalysis(
      route,
      simulation,
      historicalStats
    );
  }

  const prompt = `
You are the RiskRoute logistics risk decision engine.

Your task is to analyse a simulated logistics route.

The simulation engine has already generated the numerical risk score.
Do NOT randomly calculate another score and do NOT invent information.

You must:

- Explain the current route condition.
- Interpret traffic delay.
- Interpret weather conditions.
- Interpret accidents.
- Interpret road closures.
- Evaluate the supplied simulation risk score.
- Compare the current result with historical simulations.
- Identify the most important risk factors.
- Recommend what the logistics operator should do.
- Give an evidence-based confidence value.

IMPORTANT:

1. Never invent live traffic, weather, accidents or road closures.
2. Only use information supplied in the data.
3. Historical simulations are evidence, not facts about the current route.
4. A larger historical sample gives stronger evidence.
5. A small historical sample should reduce confidence.
6. Confidence is NOT a guarantee of safety.
7. Keep the summary understandable to a logistics operator.
8. Return only the requested JSON structure.

ROUTE AND EVIDENCE:

${JSON.stringify(
  evidence,
  null,
  2
)}
`;

  try {
    const response =
      await openai.responses.create({
        model: MODEL,

        instructions:
          "You are an evidence-based logistics risk analysis engine. Never invent route information.",

        input: prompt,

        text: {
          format: {
            type: "json_schema",

            name: "riskroute_analysis",

            strict: true,

            schema: analysisSchema
          }
        }
      });

    if (!response.output_text) {
      throw new Error(
        "OpenAI returned no output."
      );
    }

    const analysis = JSON.parse(
      response.output_text
    );

    const confidenceCap =
      calculateEvidenceCap(
        {
          simulation
        },
        historicalStats.count
      );

    analysis.confidence = Math.round(
      Math.min(
        Number(analysis.confidence),
        confidenceCap
      )
    );

    analysis.riskScore = Math.max(
      0,
      Math.min(
        100,
        Number(analysis.riskScore)
      )
    );

    return analysis;
  } catch (error) {
    console.error(
      "OpenAI analysis failed:",
      error
    );

    return fallbackAnalysis(
      route,
      simulation,
      historicalStats
    );
  }
}

async function askRouteQuestion({
  question,
  route,
  simulation,
  weather,
  traffic,
  historicalSimulations
}) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      answer:
        "The OpenAI service is not configured. Please check OPENAI_API_KEY in backend/.env."
    };
  }

  const historicalStats =
    calculateHistoricalStatistics(
      historicalSimulations
    );

  const context = {
    route,

    currentSimulation:
      simulation || null,

    weather:
      weather || null,

    traffic:
      traffic || null,

    historicalStatistics:
      historicalStats
  };

  const prompt = `
You are RiskRoute AI.

Answer the user's question using ONLY the supplied route context.

Do not invent live conditions.

If the supplied information is insufficient,
clearly say what information is missing.

User question:
${question}

Route context:
${JSON.stringify(
  context,
  null,
  2
)}
`;

  const response =
    await openai.responses.create({
      model: MODEL,

      instructions:
        "You are RiskRoute AI, an evidence-based logistics route assistant.",

      input: prompt,

      text: {
        verbosity: "low"
      }
    });

  return {
    answer:
      response.output_text ||
      "I could not generate an answer from the supplied information."
  };
}

module.exports = {
  analyzeRoute,
  askRouteQuestion
};