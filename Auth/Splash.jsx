import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, Image } from 'react-native';

export default function Splash({ navigation }) {

  // Animations
  const truckX = useRef(new Animated.Value(-300)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const loading = useRef(new Animated.Value(0)).current;

  useEffect(() => {

  
    Animated.timing(truckX, {
      toValue: 0,
      duration: 1200,
      useNativeDriver: true,
    }).start();

    
    setTimeout(() => {
      Animated.timing(fade, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }).start();
    }, 800);

    
    setTimeout(() => {
      Animated.timing(loading, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: false,
      }).start();
    }, 1000);

   
    const timer = setTimeout(() => {
      navigation.navigate('SignUP'); 
    }, 4500);

    return () => clearTimeout(timer);

  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E1F" />

      <Animated.View style={{ transform: [{ translateX: truckX }] }}>
        <Image
          source={require('../assets/Truck driver.gif')}
          style={{ width: 200, height: 200 }}
        />
      </Animated.View>

     
      <Animated.View style={{ opacity: fade }}>
        <Text style={styles.title}>Risk Route</Text>
        <Text style={styles.subtitle}>
          Intelligent Logistics Intelligence
        </Text>
      </Animated.View>

     
      <View style={styles.loadingTrack}>
        <Animated.View
          style={[
            styles.loadingFill,
            {
              width: loading.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1F',
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    marginBottom: 20,
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 12,
    color: '#8FA3BF',
    marginTop: 6,
    textAlign: 'center',
    letterSpacing: 1,
  },

  loadingTrack: {
    width: 200,
    height: 4,
    backgroundColor: '#1F2A44',
    borderRadius: 10,
    marginTop: 40,
    overflow: 'hidden',
  },

  loadingFill: {
    height: 4,
    backgroundColor: '#4DA3FF',
  },
});