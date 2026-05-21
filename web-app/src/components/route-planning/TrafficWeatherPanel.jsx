import React, { useState, useEffect } from 'react';
import { Navigation, AlertTriangle, CloudRain, Fuel, Car, Wind, Thermometer } from 'lucide-react';

const TrafficWeatherPanel = ({ lat = 40.7128, lng = -74.0060 }) => {
  const [trafficData, setTrafficData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWeatherData();
    
    const interval = setInterval(() => {
      fetchWeatherData();
    }, 300000);
    
    return () => clearInterval(interval);
  }, [lat, lng]);

  const fetchWeatherData = async () => {
    try {
      setLoading(true);
      
      // Using wttr.in - completely free, no API key required
      const response = await fetch(
        `https://wttr.in/${lat},${lng}?format=j1`
      );
      
      if (!response.ok) {
        throw new Error('Weather API request failed');
      }
      
      const data = await response.json();
      
      // Parse wttr.in response
      const currentCondition = data.current_condition[0];
      const weather = {
        main: {
          temp: parseInt(currentCondition.temp_C),
          humidity: parseInt(currentCondition.humidity)
        },
        weather: [{
          main: currentCondition.weatherDesc[0].value,
          description: currentCondition.weatherDesc[0].value
        }],
        wind: {
          speed: parseInt(currentCondition.windspeedKmph)
        }
      };
      
      setWeatherData(weather);
      
      // Generate traffic analysis based on weather
      const trafficAnalysis = generateTrafficAnalysis(weather, data);
      setTrafficData(trafficAnalysis);
      setError(null);
      
    } catch (err) {
      console.error('Error fetching weather data:', err);
      setError('Using simulated data');
      
      // Fallback to simulated data
      const fallbackWeather = getFallbackWeather();
      setWeatherData(fallbackWeather);
      setTrafficData(getFallbackTraffic());
      
    } finally {
      setLoading(false);
    }
  };

  const generateTrafficAnalysis = (weather, rawData = null) => {
    const currentHour = new Date().getHours();
    const isRushHour = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 16 && currentHour <= 19);
    const weatherCondition = weather.weather[0].main.toLowerCase();
    
    let baseDelay = isRushHour ? 15 : 5;
    let weatherDelay = 0;
    let weatherImpact = '';
    let visibility = 'Good';
    
    // Check for bad weather conditions
    if (weatherCondition.includes('rain') || weatherCondition.includes('drizzle')) {
      weatherDelay = 12;
      weatherImpact = 'Wet roads causing slower traffic';
      visibility = 'Reduced';
    } else if (weatherCondition.includes('snow')) {
      weatherDelay = 25;
      weatherImpact = 'Snow accumulation affecting all routes';
      visibility = 'Poor';
    } else if (weatherCondition.includes('fog') || weatherCondition.includes('mist')) {
      weatherDelay = 18;
      weatherImpact = 'Low visibility, reduced speed limits';
      visibility = 'Poor';
    } else if (weatherCondition.includes('thunder')) {
      weatherDelay = 30;
      weatherImpact = 'Severe weather, dangerous driving conditions';
      visibility = 'Very poor';
    } else {
      weatherDelay = 0;
      weatherImpact = 'Clear conditions, normal traffic flow';
      visibility = 'Good';
    }
    
    const totalDelay = baseDelay + weatherDelay;
    
    let congestionLevel = 'Low';
    if (totalDelay > 30) congestionLevel = 'Severe';
    else if (totalDelay > 15) congestionLevel = 'Moderate';
    else if (totalDelay > 5) congestionLevel = 'Light';
    
    const baseFuelConsumption = 4.2;
    const fuelIncrease = (totalDelay / 60) * 0.8;
    const estimatedFuel = (baseFuelConsumption + fuelIncrease).toFixed(1);
    
    return {
      delay: totalDelay,
      congestionLevel,
      weatherImpact,
      visibility,
      estimatedFuel,
      isRushHour,
      temperature: weather.main?.temp,
      windSpeed: weather.wind?.speed,
      weatherCondition: weather.weather[0].main
    };
  };

  const getFallbackWeather = () => ({
    main: { temp: 18, humidity: 65 },
    weather: [{ main: 'Clear', description: 'clear sky' }],
    wind: { speed: 12 }
  });

  const getFallbackTraffic = () => ({
    delay: 12,
    congestionLevel: 'Moderate',
    weatherImpact: 'Light traffic conditions',
    visibility: 'Good',
    estimatedFuel: 4.2,
    isRushHour: false
  });

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold flex items-center gap-2">
          <Navigation className="w-4 h-4" /> 
          Traffic & Weather Analysis
        </h3>
        <div className="mt-4 space-y-2">
          <div className="animate-pulse">
            <div className="h-4 bg-blue-200 dark:bg-blue-800 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-blue-200 dark:bg-blue-800 rounded w-full mb-2"></div>
            <div className="h-4 bg-blue-200 dark:bg-blue-800 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
      <h3 className="font-semibold flex items-center gap-2 mb-3">
        <Navigation className="w-4 h-4" /> 
        Traffic & Weather Analysis
      </h3>
      
      {error && (
        <div className="mb-3 p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-lg text-xs flex items-center gap-2">
          <AlertTriangle className="w-3 h-3" />
          {error}
        </div>
      )}
      
      <div className="space-y-3">
        {/* Traffic Information */}
        <div className="flex items-start gap-2 text-sm">
          <Car className="w-4 h-4 mt-0.5 text-blue-600 dark:text-blue-400" />
          <div>
            <span className="font-medium">Current congestion: </span>
            <span className={`${
              trafficData?.congestionLevel === 'Severe' ? 'text-red-600' :
              trafficData?.congestionLevel === 'Moderate' ? 'text-yellow-600' :
              'text-green-600'
            } font-medium`}>
              {trafficData?.congestionLevel}
            </span>
            {trafficData?.delay > 0 && (
              <span>, +{trafficData.delay} min delay expected</span>
            )}
            {trafficData?.isRushHour && (
              <span className="block text-xs text-gray-600 dark:text-gray-400 mt-1">
                Rush hour traffic pattern detected
              </span>
            )}
          </div>
        </div>
        
        {/* Weather Impact */}
        <div className="flex items-start gap-2 text-sm">
          <CloudRain className="w-4 h-4 mt-0.5 text-blue-600 dark:text-blue-400" />
          <div>
            <span className="font-medium">Weather impact: </span>
            <span>{trafficData?.weatherImpact}</span>
            {weatherData && (
              <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Thermometer className="w-3 h-3" />
                  {Math.round(weatherData.main?.temp)}°C
                </span>
                <span className="flex items-center gap-1">
                  <Wind className="w-3 h-3" />
                  {Math.round(weatherData.wind?.speed)} km/h
                </span>
                <span>Visibility: {trafficData?.visibility}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Fuel Consumption */}
        {/* <div className="flex items-start gap-2 text-sm">
          <Fuel className="w-4 h-4 mt-0.5 text-blue-600 dark:text-blue-400" />
          <div>
            <span className="font-medium">Estimated fuel consumption: </span>
            <span>{trafficData?.estimatedFuel} gal for selected route</span>
            {trafficData?.delay > 15 && (
              <span className="block text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                +{((trafficData.delay / 60) * 0.8).toFixed(1)} gal due to congestion
              </span>
            )}
          </div>
        </div> */}
      </div>
      
      {(trafficData?.delay > 20 || trafficData?.weatherCondition?.toLowerCase().includes('snow') || 
        trafficData?.weatherCondition?.toLowerCase().includes('thunder')) && (
        <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2 text-xs text-orange-700 dark:text-orange-400">
            <AlertTriangle className="w-3 h-3 mt-0.5" />
            <span>
              Recommendation: Consider alternative route or delay departure until conditions improve.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrafficWeatherPanel;