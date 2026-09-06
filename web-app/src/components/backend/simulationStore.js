const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "data");
const DATABASE_FILE = path.join(DATA_DIR, "simulations.json");

function ensureDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATABASE_FILE)) {
    fs.writeFileSync(DATABASE_FILE, "[]", "utf8");
  }
}

function readSimulations() {
  ensureDatabase();

  try {
    const content = fs.readFileSync(DATABASE_FILE, "utf8");
    const data = JSON.parse(content);

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Failed to read simulations:", error);
    return [];
  }
}

function writeSimulations(simulations) {
  ensureDatabase();

  fs.writeFileSync(
    DATABASE_FILE,
    JSON.stringify(simulations, null, 2),
    "utf8"
  );
}

function getSimulations() {
  return readSimulations();
}

function createSimulation(data) {
  const simulations = readSimulations();

  const simulation = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),

    routeName: data.routeName || "Unknown Route",
    origin: data.origin || "Unknown Origin",
    destination: data.destination || "Unknown Destination",

    route: data.route || null,
    simulation: data.simulation || null,
    weather: data.weather || null,
    traffic: data.traffic || null,
    result: data.result || null
  };

  simulations.unshift(simulation);

  // Keep most recent 500 simulations
  const limited = simulations.slice(0, 500);

  writeSimulations(limited);

  return simulation;
}

function deleteSimulation(id) {
  const simulations = readSimulations();

  const filtered = simulations.filter(
    (simulation) => simulation.id !== id
  );

  writeSimulations(filtered);

  return true;
}

module.exports = {
  getSimulations,
  createSimulation,
  deleteSimulation
};