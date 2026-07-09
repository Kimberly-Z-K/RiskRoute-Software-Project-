import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AuthProvider, useAuth } from "./context/AuthContext";

import Login from "./Auth/Login";
import SignUp from "./Auth/SignUP";
import Splash from "./Auth/Splash";
import ForgotPassword from "./Auth/ForgotPass";
import TabNavigator from "./src/Navigation/TabNavigator";

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { user, loading, isVerified } = useAuth();

  console.log("ROOT", { loading, user: !!user, isVerified });

  if (loading) {
    return <Splash />;
  }

  return (
    <Stack.Navigator
      key={user && isVerified ? "app" : "auth"}
      screenOptions={{ headerShown: false }}
    >
      {user && isVerified ? (
        <Stack.Screen name="MainTabs" component={TabNavigator} />
      ) : (
        <>
          <Stack.Screen name="Splash" component={Splash} />
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="SignUP" component={SignUp} />
          <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}