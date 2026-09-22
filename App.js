
import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import { AppState } from "react-native";

import {
  NavigationContainer,
} from "@react-navigation/native";

import {
  createNativeStackNavigator,
} from "@react-navigation/native-stack";

import {
  AuthProvider,
  useAuth,
} from "./context/AuthContext";

import Login from "./Auth/Login";
import SignUp from "./Auth/SignUP";
import Splash from "./Auth/Splash";
import ForgotPassword from "./Auth/ForgotPass";
import TabNavigator from "./src/Navigation/TabNavigator";

import { auditLog } from "./utils/auditlogger";

const Stack = createNativeStackNavigator();

/**
 * Get the active route name,
 * including nested navigators.
 */
function getActiveRouteName(state) {
  if (
    !state ||
    !state.routes ||
    state.index == null
  ) {
    return null;
  }

  const route = state.routes[state.index];

  if (route.state) {
    return getActiveRouteName(route.state);
  }

  return route.name;
}

/**
 * Automatically audits:
 *
 * 1. Screen views
 * 2. App resumed events
 * 3. App background events
 */
function AutomaticAudit({
  navigationState,
}) {
  const { user, isVerified } = useAuth();

  const previousScreen = useRef(null);

  const previousAppState = useRef(
    AppState.currentState
  );

  /**
   * Track screen views when the navigation state changes.
   */
  useEffect(() => {
    const trackScreenView = async () => {
      if (!user || !isVerified) {
        return;
      }

      const screenName =
        getActiveRouteName(navigationState);

      if (!screenName) {
        return;
      }

      // Prevent duplicate screen-view events
      if (previousScreen.current === screenName) {
        return;
      }

      previousScreen.current = screenName;

      console.log(
        "📱 SCREEN VIEW:",
        screenName
      );

      await auditLog({
        action: "SCREEN_VIEW",

        page: screenName,

        description:
          `User opened the ${screenName} screen`,

        details: {
          screen: screenName,
          automatic: true,
        },
      });
    };

    trackScreenView();
  }, [
    navigationState,
    user,
    isVerified,
  ]);

  /**
   * Reset the previous screen when the user logs out
   * or becomes unverified.
   */
  useEffect(() => {
    if (!user || !isVerified) {
      previousScreen.current = null;
    }
  }, [user, isVerified]);

  /**
   * Track application lifecycle events.
   */
  useEffect(() => {
    const subscription =
      AppState.addEventListener(
        "change",
        async (nextAppState) => {
          const previousState =
            previousAppState.current;

          console.log(
            "📲 APP STATE:",
            previousState,
            "→",
            nextAppState
          );

          // Track app resumed
          if (
            user &&
            isVerified &&
            previousState.match(
              /inactive|background/
            ) &&
            nextAppState === "active"
          ) {
            await auditLog({
              action: "APP_RESUMED",

              page: "Mobile App",

              description:
                "RiskRoute mobile application resumed",

              details: {
                previousState,
                nextAppState,
                automatic: true,
              },
            });
          }

          // Track app background
          if (
            user &&
            isVerified &&
            nextAppState.match(
              /inactive|background/
            )
          ) {
            await auditLog({
              action: "APP_BACKGROUND",

              page: "Mobile App",

              description:
                "RiskRoute mobile application moved to the background",

              details: {
                previousState,
                nextAppState,
                automatic: true,
              },
            });
          }

          // Update the previous app state
          previousAppState.current =
            nextAppState;
        }
      );

    return () => {
      subscription.remove();
    };
  }, [user, isVerified]);

  return null;
}

/**
 * Controls authentication and main app navigation.
 */
function RootNavigator() {
  const {
    user,
    loading,
    isVerified,
  } = useAuth();

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
      key={
        user && isVerified
          ? "app"
          : "auth"
      }
      screenOptions={{
        headerShown: false,
      }}
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

/**
 * Main application component.
 */
export default function App() {
  const navigationRef = useRef(null);

  // Store the current navigation state
  const [navigationState, setNavigationState] =
    useState(null);

  /**
   * Called when navigation is ready.
   */
  const handleNavigationReady = () => {
    const state =
      navigationRef.current?.getRootState();

    if (state) {
      setNavigationState(state);

      console.log(
        "🚀 NAVIGATION READY:",
        getActiveRouteName(state)
      );
    }
  };

  /**
   * Called whenever navigation changes.
   */
  const handleNavigationStateChange = (state) => {
    setNavigationState(state);

    const screenName =
      getActiveRouteName(state);

    console.log(
      "🧭 NAVIGATION:",
      screenName
    );
  };

  return (
    <AuthProvider>
      <NavigationContainer
        ref={navigationRef}
        onReady={handleNavigationReady}
        onStateChange={handleNavigationStateChange}
      >
        <AutomaticAudit
          navigationState={navigationState}
        />

        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}