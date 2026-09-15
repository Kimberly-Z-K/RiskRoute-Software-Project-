# RiskRoute

**Intelligent Route Risk Management for Safer, Smarter Logistics.**

A data-driven logistics platform that helps fleet and logistics teams understand route risk, evaluate alternatives, simulate changing conditions, and make better transportation decisions.

---

## What is RiskRoute?

**RiskRoute** is an intelligent logistics and route risk management platform developed to support safer and more informed transportation operations.

Modern logistics teams need to make decisions while dealing with constantly changing conditions such as traffic, weather, route distance, travel time, infrastructure conditions, and potential safety risks. RiskRoute brings these factors together into a single platform so that users can evaluate a journey before committing to a route.

The platform combines **route information, environmental conditions, risk analysis, simulation, historical data, and operational information** to provide users with a clearer understanding of the risks associated with a trip.

RiskRoute consists of a web-based management dashboard and a mobile experience designed for drivers.

> **Plan the route. Understand the risk. Simulate the possibilities. Make the safer decision.**

---

#  The Problem

Logistics operations can involve fragmented information across different systems.

A logistics manager may need to consider:

*  Route distance and travel time
* Traffic conditions
*  Weather conditions
*  Route-related risk
*  Vehicle and driver information
*  Estimated trip costs
*  Potential delays
*  Alternative routes
*  Historical simulation results

When this information is difficult to access or compare, decision-making becomes slower and less informed.

**RiskRoute addresses this problem by bringing relevant route and operational information together in one system.**

---

#  Core Capabilities

| Capability                 | Description                                                  |
| -------------------------- | ------------------------------------------------------------ |
|  **Route Management**   | View and analyse available logistics routes.                 |
|  **Risk Analysis**       | Evaluate route conditions and associated risk.               |
|  **Route Alternatives**  | Compare alternative routes when available.                   |
|  **What-If Simulation**  | Test how changing conditions could affect a journey.         |
|  **Weather Analysis**   | Incorporate weather conditions into route evaluation.        |
|  **Traffic Information** | Use traffic information when analysing routes.               |
|  **Fleet Management**    | Manage vehicles and driver-related information.              |
| **Trip Monitoring**     | Support monitoring of active logistics operations.           |
|  **Alerts**              | Surface important route and trip conditions.                 |
|  **AI Insights**         | Generate route-related explanations and recommendations.     |
|  **Analytics**           | Use stored information and simulations to support decisions. |

---

#  Designed For

### Logistics Managers

Monitor routes, evaluate risk, run simulations, and make operational decisions.

### Fleet Administrators

Manage drivers, vehicles, routes, and fleet-related information.

### Truck Drivers

Use the mobile application to access trip information, follow routes, receive alerts, and update trip activity.

### Insurance Providers

Use route and risk information to support transportation risk assessment and analysis.

---

#  System Architecture

```text
                         RISKROUTE
                            │
             ┌──────────────┴──────────────┐
             │                             │
             ▼                             ▼
      ┌──────────────┐              ┌──────────────┐
      │ Web Dashboard│              │ Mobile App   │
      │ React + Vite │              │ React Native │
      └──────┬───────┘              └──────┬───────┘
             │                             │
             └──────────────┬──────────────┘
                            ▼
                   ┌─────────────────┐
                   │   Node.js API   │
                   │    Backend      │
                   └────────┬────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
        ┌──────────┐  ┌────────────┐  ┌──────────┐
        │ Supabase │  │ External   │  │ AI Layer │
        │ Database │  │ APIs       │  │          │
        └──────────┘  └────────────┘  └──────────┘
```

---

#  Technology Stack

### Frontend

* React
* Vite
* JavaScript / JSX
* Tailwind CSS
* React Router
* Lucide React

### Backend

* Node.js
* JavaScript
* REST APIs

### Database & Authentication

* Supabase
* PostgreSQL
* PostGIS
* Supabase Authentication

### Mobile

* React Native
* Expo

### External Services

* TomTom
* Weather API
* Mapping and route services

### Testing

* Playwright
* End-to-end automated testing

### Development Tools

* Git
* GitHub
* Visual Studio Code
* npm

---

#

---

#  What-If Simulation

The simulation engine allows users to investigate possible changes to a journey before making an operational decision.

A user can:

1. Select a route.
2. Review the current route information.
3. Change relevant conditions.
4. Run the simulation.
5. Allow the system to process the scenario.
6. Review the calculated results.
7. Save the simulation.
8. Retrieve previously saved simulations.

Simulation results can include information such as:

* Risk
* Travel time
* Delay
* Distance
* Estimated cost
* Weather impact
* Route conditions

This allows users to ask:

> **"What happens if the conditions change?"**

rather than relying only on the current route state.

---

#  AI-Assisted Insights

RiskRoute includes an AI layer intended to provide additional interpretation of route and simulation information.

The AI component can assist with questions relating to:

* Route risk
* Weather
* Alternative routes
* Travel time
* Trip cost
* Simulation results
* Recommendations
* Risk confidence

The intended workflow is:

```text
Route / Simulation Data
          │
          ▼
     Stored Data
          │
          ▼
       AI Layer
          │
          ▼
Risk Explanation
+ Recommendation
+ Confidence
```

The AI layer is designed to complement the application's existing risk and simulation functionality rather than replace the underlying system calculations.

---

# Weather & Environmental Conditions

Weather conditions can influence the evaluation of a route.

RiskRoute supports conditions such as:

* Sunny
*  Cloudy
*  Rain
*  Fog
*  Windy

Weather information can be incorporated into route analysis and simulations to demonstrate how environmental conditions may affect transportation risk.

---

#  Data & Persistence

RiskRoute uses **Supabase PostgreSQL** for persistent application data.

The database supports information such as:

* Users
* Drivers
* Vehicles
* Routes
* Trips
* Simulations
* Risk information
* Historical records
* Operational data

Authentication is handled using Supabase Auth.

The application retrieves and saves data through the configured application services rather than requiring users to manually manipulate database records.

---

```text
```

---

#  Getting Started

## Prerequisites

Before running RiskRoute, make sure the following are installed:

* Node.js 20+
* npm
* Git
* Visual Studio Code or another code editor
* A modern web browser

For mobile development:

* Expo
* Expo Go

Check Node.js and npm:

```bash
node --version
npm --version
```

---

#  Installation

Clone the repository:

```bash
git clone <REPOSITORY_URL>
```

Enter the project:

```bash
cd RiskRoute-Software-Project-
```

Navigate to the web application:

```bash
cd web-app
```

Install dependencies:

```bash
npm install
```

---

#

---

#  Running RiskRoute

## Start the Web Application

From:

```text
web-app/
```

run:

```bash
npm run dev
```

The Vite application will normally be available at:

```text
http://localhost:5173
```

---

## Start the Backend

Open another terminal and navigate to the backend:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Start the server:

```bash
node server2.js
```

The development backend is configured to run on the project's configured port.

---

#  Automated Testing

RiskRoute uses **Playwright** for end-to-end automated testing.

The tests validate important user-facing workflows rather than only individual functions.

Run the complete end-to-end test suite:

```bash
npm run test:e2e
```

Example:

```text
Running tests...

✓ Dashboard works
✓ Login page loads
✓ Simulation functionality works

X passed
```

---

#  Test Reporting

A detailed Playwright HTML report can be generated/viewed after testing.

Run:

```bash
npx playwright show-report
```

The report provides information including:

* Test results
* Passed tests
* Failed tests
* Execution time
* Test steps
* Screenshots
* Traces
* Failure details

This allows the development team to identify regressions and investigate failed workflows.

---

#
