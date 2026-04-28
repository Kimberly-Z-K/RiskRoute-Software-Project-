import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Login from './Auth/Login';
import SignUp from './Auth/SignUP';
import Splash from './Auth/Splash';
import ForgotPassword from './Auth/ForgotPass'

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={Splash} />
        <Stack.Screen name="SignUP" component={SignUp} />
        <Stack.Screen name="Login" component={Login}/>
        <Stack.Screen name="ForgotPassword" component={ForgotPassword}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}