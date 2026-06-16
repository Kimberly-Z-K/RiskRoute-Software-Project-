import React, { useState, useEffect } from 'react';
import { Navigation, AlertTriangle } from 'lucide-react';


const TrafficWeatherPanel = ({ lat = -26.20, lng = 28.05 }) => {
  const [trafficData, setTrafficData] = useState(null);
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
      
      const response = await fetch(`https://wttr.in/${lat},${lng}?format=j1`);
      
      if (!response.ok) {
        throw new Error('Weather API failed');
      }
      
      const data = await response.json();
      const currentCondition = data.current_condition[0];
      
      const weather = {
        temp: parseInt(currentCondition.temp_C),
        humidity: parseInt(currentCondition.humidity),
        weather: currentCondition.weatherDesc[0].value,
        windSpeed: parseInt(currentCondition.windspeedKmph)
      };
      
      const trafficAnalysis = generateTrafficAnalysis(weather);
      setTrafficData(trafficAnalysis);
      setError(null);
      
    } catch (err) {
      console.error('Error:', err);
      setError('Using simulated data');
      setTrafficData(getFallbackTraffic());
      
    } finally {
      setLoading(false);
    }
  };

  const generateTrafficAnalysis = (weather) => {
    const currentHour = new Date().getHours();
    const isRushHour = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 16 && currentHour <= 19);
    const weatherCondition = weather.weather.toLowerCase();
    
    let baseDelay = isRushHour ? 15 : 5;
    let weatherDelay = 0;
    
    if (weatherCondition.includes('rain') || weatherCondition.includes('drizzle')) {
      weatherDelay = 12;
    } else if (weatherCondition.includes('snow')) {
      weatherDelay = 25;
    } else if (weatherCondition.includes('fog') || weatherCondition.includes('mist')) {
      weatherDelay = 18;
    } else if (weatherCondition.includes('thunder')) {
      weatherDelay = 30;
    }
    
    const totalDelay = baseDelay + weatherDelay;
    
    let congestionLevel = 'Low';
    if (totalDelay > 30) congestionLevel = 'Severe';
    else if (totalDelay > 15) congestionLevel = 'Moderate';
    else if (totalDelay > 5) congestionLevel = 'Light';
    
    return {
      delay: totalDelay,
      congestionLevel,
      isRushHour,
      temperature: weather.temp,
      windSpeed: weather.windSpeed
    };
  };

  const getFallbackTraffic = () => ({
    delay: 12,
    congestionLevel: 'Moderate',
    isRushHour: false,
    temperature: 18,
    windSpeed: 12
  });

  if (loading) {
    return (
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-gray-900">Traffic & Weather</h3>
        <div className="mt-3 animate-pulse">
          <div className="h-3 bg-blue-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-blue-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
      <h3 className="font-semibold text-gray-900 mb-3">Traffic & Weather</h3>
      
      {error && (
        <div className="mb-3 p-2 bg-yellow-100 text-yellow-800 rounded-md text-sm">
          {error}
        </div>
      )}
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Congestion:</span>
          <span className={`font-medium ${
            trafficData?.congestionLevel === 'Severe' ? 'text-red-600' :
            trafficData?.congestionLevel === 'Moderate' ? 'text-yellow-600' :
            'text-green-600'
          }`}>
            {trafficData?.congestionLevel}
          </span>
          {trafficData?.delay > 0 && (
            <span className="text-sm text-gray-600">+{trafficData.delay} min</span>
          )}
        </div>
        
        {trafficData?.isRushHour && (
          <div className="text-xs text-gray-500">
            Rush hour detected
          </div>
        )}
        
        <div className="flex gap-4 text-sm">
          <span className="text-gray-600">{trafficData?.temperature}°C</span>
          <span className="text-gray-600">{trafficData?.windSpeed} km/h</span>
        </div>
      </div>
      
      {(trafficData?.delay > 20 || trafficData?.congestionLevel === 'Severe') && (
        <div className="mt-3 pt-3 border-t border-blue-200">
          <div className="flex items-center gap-2 text-xs text-orange-700">
            <AlertTriangle className="w-3 h-3" />
            <span>Consider alternative route</span>
          </div>
        </div>
      )}
    </div>
  );
};


export default TrafficWeatherPanel;