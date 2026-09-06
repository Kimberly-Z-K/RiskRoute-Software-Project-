const ROUTES = [
  {
    id: "route-19",
    display_name:
      "Route #19 - Johannesburg to Durban",
    origin_name: "Johannesburg",
    destination_name: "Durban",
    origin_lat: -26.2041,
    origin_lng: 28.0473,
    dest_lat: -29.8587,
    dest_lng: 31.0218,
    distance_km: 570.29,
    duration_min: 333,
    estimated_cost: 950,
    traffic_delay: 3,
  },
  {
    id: "route-18",
    display_name:
      "Route #18 - OR Tambo to Sandton",
    origin_name:
      "OR Tambo International Airport",
    destination_name: "Sandton",
    origin_lat: -26.1392,
    origin_lng: 28.2460,
    dest_lat: -26.1076,
    dest_lng: 28.0567,
    distance_km: 36.649,
    duration_min: 47,
    estimated_cost: 180,
    traffic_delay: 2,
  },
];

/*
|--------------------------------------------------------------------------
| WEATHER RULES
|--------------------------------------------------------------------------
*/

const WEATHER_RULES = {
  sunny: {
    label: "Sunny / Clear",
    multiplier: 1,
    risk: 5,
  },

  partly_cloudy: {
    label: "Partly Cloudy",
    multiplier: 1.02,
    risk: 8,
  },

  cloudy: {
    label: "Cloudy",
    multiplier: 1.05,
    risk: 10,
  },

  light_rain: {
    label: "Light Rain",
    multiplier: 1.1,
    risk: 15,
  },

  moderate_rain: {
    label: "Moderate Rain",
    multiplier: 1.18,
    risk: 25,
  },

  heavy_rain: {
    label: "Heavy Rain",
    multiplier: 1.3,
    risk: 40,
  },

  fog: {
    label: "Fog / Mist",
    multiplier: 1.2,
    risk: 30,
  },

  windy: {
    label: "Strong Winds",
    multiplier: 1.1,
    risk: 20,
  },
};

/*
|--------------------------------------------------------------------------
| GET ROUTE
|--------------------------------------------------------------------------
*/

function getRoute(routeId) {
  return (
    ROUTES.find(
      (route) => route.id === routeId
    ) || ROUTES[0]
  );
}

/*
|--------------------------------------------------------------------------
| GET ROUTES
|--------------------------------------------------------------------------
*/

function getAvailableRoutes() {
  return ROUTES;
}

/*
|--------------------------------------------------------------------------
| GET WEATHER OPTIONS
|--------------------------------------------------------------------------
*/

function getWeatherOptions() {
  return WEATHER_RULES;
}

/*
|--------------------------------------------------------------------------
| RISK LEVEL
|--------------------------------------------------------------------------
*/

function getRiskLevel(score) {
  if (score >= 85) return "CRITICAL";
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";

  return "LOW";
}

/*
|--------------------------------------------------------------------------
| DECISION
|--------------------------------------------------------------------------
*/

function getDecision(
  score,
  accident,
  roadClosure
) {
  if (
    roadClosure ||
    score >= 85
  ) {
    return "AVOID_ROUTE";
  }

  if (
    accident ||
    score >= 70
  ) {
    return "CONSIDER_ALTERNATIVE";
  }

  if (score >= 40) {
    return "PROCEED_WITH_CAUTION";
  }

  return "PROCEED";
}

/*
|--------------------------------------------------------------------------
| CALCULATE RISK
|--------------------------------------------------------------------------
*/

function calculateRisk({
  delayMinutes,
  weather,
  accident,
  roadClosure,
}) {
  const weatherRule =
    WEATHER_RULES[weather] ||
    WEATHER_RULES.sunny;

  const delayRisk = Math.min(
    25,
    Number(delayMinutes || 0) / 2
  );

  const weatherRisk =
    Number(
      weatherRule.risk || 0
    );

  const accidentRisk =
    accident ? 30 : 0;

  const closureRisk =
    roadClosure ? 35 : 0;

  const score =
    weatherRisk +
    delayRisk +
    accidentRisk +
    closureRisk;

  return Math.min(
    100,
    Math.round(score)
  );
}

/*
|--------------------------------------------------------------------------
| RUN SIMULATION
|--------------------------------------------------------------------------
*/

function runSimulation({
  routeId,
  delay = 0,
  delayMinutes,
  weather = "sunny",
  accident = false,
  roadClosure = false,
}) {
  const route =
    getRoute(routeId);

  const weatherRule =
    WEATHER_RULES[weather] ||
    WEATHER_RULES.sunny;

  const requestedDelay =
    delayMinutes !== undefined
      ? delayMinutes
      : delay;

  const additionalDelay =
    Math.max(
      Number(
        requestedDelay || 0
      ),
      0
    );

  const weatherDelay =
    route.duration_min *
    (
      weatherRule.multiplier - 1
    );

  const accidentDelay =
    accident ? 20 : 0;

  const closureDelay =
    roadClosure ? 30 : 0;

  const totalDelay = Math.max(
    Math.round(
      additionalDelay +
      weatherDelay +
      accidentDelay +
      closureDelay +
      Number(
        route.traffic_delay || 0
      )
    ),
    0
  );

  const currentDuration =
    Math.round(
      route.duration_min +
      totalDelay
    );

  let currentCost =
    Number(
      route.estimated_cost || 0
    );

  if (
    currentCost <= 0
  ) {
    currentCost =
      route.distance_km > 0
        ? route.distance_km * 2
        : currentDuration * 3;
  }

  currentCost = Math.round(
    currentCost +
    totalDelay * 1.2
  );

  const riskScore =
    calculateRisk({
      delayMinutes:
        totalDelay,
      weather,
      accident,
      roadClosure,
    });

  const riskLevel =
    getRiskLevel(
      riskScore
    );

  const decision =
    getDecision(
      riskScore,
      accident,
      roadClosure
    );

  /*
  |--------------------------------------------------------------------------
  | Recommended alternative
  |--------------------------------------------------------------------------
  */

  const optimalDuration =
    Math.max(
      Math.round(
        route.duration_min *
        0.85
      ),
      1
    );

  const optimalRisk =
    Math.max(
      riskScore - 30,
      5
    );

  const optimalCost =
    Math.max(
      Math.round(
        currentCost * 0.9
      ),
      1
    );

  let recommendation =
    "✅ Current route conditions are acceptable.";

  if (
    roadClosure
  ) {
    recommendation =
      "🚧 Road closure simulated. Use an alternative route.";
  } else if (
    accident
  ) {
    recommendation =
      "🚗 Accident simulated. Consider an alternative route.";
  } else if (
    weather ===
    "heavy_rain"
  ) {
    recommendation =
      "🌧️ Heavy rain simulated. Reduce speed and allow additional time.";
  } else if (
    totalDelay > 30
  ) {
    recommendation =
      "⚠️ Significant delay simulated. Consider an alternative route.";
  }

  return {
    id:
      `simulation-${Date.now()}`,

    routeId:
      route.id,

    routeName:
      route.display_name,

    current: {
      duration:
        currentDuration,

      cost:
        `R${currentCost.toLocaleString(
          "en-ZA"
        )}`,

      riskScore:
        riskScore,

      riskLevel:
        riskLevel,

      delay:
        totalDelay,
    },

    optimal: {
      duration:
        optimalDuration,

      cost:
        `R${optimalCost.toLocaleString(
          "en-ZA"
        )}`,

      riskScore:
        optimalRisk,

      riskLevel:
        getRiskLevel(
          optimalRisk
        ),

      delay: 0,
    },

    alternatives:
      riskScore >= 60
        ? [
            {
              id:
                `${route.id}-alternative`,

              displayName:
                `${route.destination_name} Alternative`,

              name:
                `${route.destination_name} Alternative`,

              duration:
                Math.round(
                  route.duration_min *
                  1.08
                ),

              distance:
                route.distance_km,

              risk_level:
                optimalRisk >=
                40
                  ? "medium"
                  : "low",

              recommendation:
                "Alternative route available for comparison.",
            },
          ]
        : [],

    params: {
      delay:
        Number(
          requestedDelay || 0
        ),

      weather,

      accident,

      roadClosure,

      weatherLabel:
        weatherRule.label,
    },

    decision,

    recommendation,
  };
}

module.exports = {
  runSimulation,
  getAvailableRoutes,
  getWeatherOptions,
  getRoute,
};