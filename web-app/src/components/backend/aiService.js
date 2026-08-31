// src/services/aiService.js
class AIService {
  constructor() {
    this.simulationHistory = [];
    this.learnedPatterns = new Map();
    this.initialized = true;
    this.routePatterns = new Map();
  }

  async learnFromHistory(simulations) {
    if (!simulations || simulations.length === 0) {
      console.log('📚 No simulation history to learn from');
      return;
    }

    console.log(`📚 Learning from ${simulations.length} historical simulations...`);
    this.simulationHistory = simulations;
    const patterns = this.analyzePatterns(simulations);
    this.learnedPatterns = patterns;
    
    // Build route-specific patterns
    this.buildRoutePatterns(simulations);
    
    console.log('✅ Learned patterns from history:', Object.keys(patterns));
    return patterns;
  }

  analyzePatterns(simulations) {
    const patterns = {
      weatherPatterns: new Map(),
      riskPatterns: new Map(),
      timePatterns: new Map(),
      commonConditions: new Map()
    };

    simulations.forEach(sim => {
      const weather = sim.params?.weather || sim.parameters?.weather || 'unknown';
      if (weather) {
        patterns.weatherPatterns.set(weather, (patterns.weatherPatterns.get(weather) || 0) + 1);
      }

      const riskScore = sim.current_route?.riskScore || sim.current?.riskScore || 0;
      if (riskScore > 0) {
        const riskLevel = riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low';
        patterns.riskPatterns.set(riskLevel, (patterns.riskPatterns.get(riskLevel) || 0) + 1);
      }

      if (sim.params?.hasAccident || sim.parameters?.hasAccident) {
        patterns.commonConditions.set('accident', (patterns.commonConditions.get('accident') || 0) + 1);
      }
      if (sim.params?.hasRoadClosure || sim.parameters?.hasRoadClosure) {
        patterns.commonConditions.set('roadClosure', (patterns.commonConditions.get('roadClosure') || 0) + 1);
      }
    });

    return patterns;
  }

  buildRoutePatterns(simulations) {
    this.routePatterns = new Map();
    
    simulations.forEach(sim => {
      const routeName = sim.route_name || sim.routeName || 'Unknown';
      if (!this.routePatterns.has(routeName)) {
        this.routePatterns.set(routeName, {
          count: 0,
          totalDuration: 0,
          totalRisk: 0,
          weathers: new Map(),
          avgDuration: 0,
          avgRisk: 0
        });
      }
      
      const routeData = this.routePatterns.get(routeName);
      routeData.count++;
      routeData.totalDuration += sim.current_route?.duration || sim.current?.duration || 0;
      routeData.totalRisk += sim.current_route?.riskScore || sim.current?.riskScore || 0;
      
      const weather = sim.params?.weather || sim.parameters?.weather || 'unknown';
      routeData.weathers.set(weather, (routeData.weathers.get(weather) || 0) + 1);
      
      routeData.avgDuration = Math.round(routeData.totalDuration / routeData.count);
      routeData.avgRisk = Math.round(routeData.totalRisk / routeData.count);
    });
  }

  getRouteInsights(routeName) {
    if (!this.routePatterns.has(routeName)) {
      return null;
    }
    return this.routePatterns.get(routeName);
  }

  getInsights() {
    return {
      totalSimulations: this.simulationHistory.length,
      routeCount: this.routePatterns.size,
      learnedPatterns: this.learnedPatterns
    };
  }
}

const aiService = new AIService();
export default aiService;