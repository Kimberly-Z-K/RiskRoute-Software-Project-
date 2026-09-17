import React, { useEffect, useRef } from "react";
import { AppState } from "react-native";
import {
  NavigationContainer,
  useNavigationState,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AuthProvider, useAuth } from "./context/AuthContext";

import Login from "./Auth/Login";
import SignUp from "./Auth/SignUP";
import Splash from "./Auth/Splash";
import ForgotPassword from "./Auth/ForgotPass";
import TabNavigator from "./src/Navigation/TabNavigator";

import { auditLog } from "./utils/auditlogger";

const Stack = createNativeStackNavigator();

function getActiveRouteName(state) {
  if (!state || !state.routes || state.index == null) {
    return null;
  }

  const route = state.routes[state.index];

  if (route.state) {
    return getActiveRouteName(route.state);
  }

  return route.name;
}

/**
 * Automatically audits navigation and app lifecycle events.
 */
function AutomaticAudit() {
  const { user, isVerified } = useAuth();

  const previousScreen = useRef(null);
  const previousAppState = useRef(AppState.currentState);

  const handleNavigationChange = async (state) => {
    if (!user || !isVerified) {
      return;
    }

    const screenName = getActiveRouteName(state);

    if (!screenName) {
      return;
    }

    // Don't create duplicate logs when the same screen renders again.
    if (previousScreen.current === screenName) {
      return;
    }

    previousScreen.current = screenName;

    console.log("📱 SCREEN VIEW:", screenName);

    await auditLog({
      action: "SCREEN_VIEW",
      page: screenName,
      description: `User opened the ${screenName} screen`,
      details: {
        screen: screenName,
        automatic: true,
      },
    });
  };

  useEffect(() => {
    if (!user || !isVerified) {
      previousScreen.current = null;
    }
  }, [user, isVerified]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        const previousState = previousAppState.current;

        console.log(
          "📲 APP STATE:",
          previousState,
          "→",
          nextAppState
        );

        if (
          user &&
          isVerified &&
          previousState.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          await auditLog({
            action: "APP_RESUMED",
            page: "Mobile App",
            description: "RiskRoute mobile application resumed",
            details: {
              automatic: true,
            },
          });
        }

        if (
          user &&
          isVerified &&
          nextAppState.match(/inactive|background/)
        ) {
          await auditLog({
            action: "APP_BACKGROUND",
            page: "Mobile App",
            description: "RiskRoute mobile application moved to the background",
            details: {
              automatic: true,
            },
          });
        }

        previousAppState.current = nextAppState;
      }
    );

    return () => {
      subscription.remove();
    };
  }, [user, isVerified]);

  return null;
}

function RootNavigator() {
  const { user, loading, isVerified } = useAuth();

  console.log("ROOT", {
    loading,
    user: !!user,
    isVerified,
  });

  if (loading) {
    return <Splash />;
  }

  return (
    <Stack.Navigator
      key={user && isVerified ? "app" : "auth"}
      screenOptions={{ headerShown: false }}
    >
      {user && isVerified ? (
        <Stack.Screen
          name="MainTabs"
          component={TabNavigator}
        />
      ) : (
        <>
          <Stack.Screen
            name="Splash"
            component={Splash}
          />

          <Stack.Screen
            name="Login"
            component={Login}
          />

          <Stack.Screen
            name="SignUP"
            component={SignUp}
          />

          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPassword}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const navigationRef = useRef(null);

  const handleNavigationReady = () => {
    const state = navigationRef.current?.getRootState();

    if (state) {
      console.log(
        "🚀 NAVIGATION READY:",
        getActiveRouteName(state)
      );
    }
  };

  const handleNavigationStateChange = async (state) => {
    const screenName = getActiveRouteName(state);

    console.log(
      "🧭 NAVIGATION:",
      screenName
    );

    if (!screenName) {
      return;
    }

    // The AutomaticAudit component handles the actual database logging.
  };

  return (
    <AuthProvider>
      <NavigationContainer
        ref={navigationRef}
        onReady={handleNavigationReady}
        onStateChange={handleNavigationStateChange}
      >
        <AutomaticAudit />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}