import { useState, useEffect } from 'react';

export const useRealTimeUpdates = (interval = 8000) => {
  const [updateSignal, setUpdateSignal] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => setUpdateSignal(prev => prev + 1), interval);
    return () => clearInterval(timer);
  }, [interval]);
  
  return updateSignal;
};