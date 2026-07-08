import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import Home from "../../Screens/index";
import Profile from "../../Screens/Profile";
import Location from "../../Screens/Location";
import Notifications from "../../Screens/Notifications";
import FuelScreen from "../../Screens/fuel";

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,

        tabBarStyle: {
          position: "absolute",
          bottom: 20,
          left: 20,
          right: 20,
          elevation: 10,
          backgroundColor: "#fcf6f6",
          borderRadius: 70,
          height: 65,

          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 30,
          shadowOffset: { width: 0, height: 5 },

          borderTopWidth: 0,
        },
      }}
    >

      {/* HOME */}
      <Tab.Screen
        name="Home"
        component={Home}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={24}
              color={focused ? "#007bff" : "#888"}
            />
          ),
        }}
      />

      {/* LOCATION */}
      <Tab.Screen
        name="Location"
        component={Location}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "location" : "location-outline"}
              size={24}
              color={focused ? "#007bff" : "#888"}
            />
          ),
        }}
      />

       {/* fuel*/}
      <Tab.Screen
        name="FuelScreen"
        component={FuelScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "speedometer" : "speedometer-outline"}
              size={24}
              color={focused ? "#007bff" : "#888"}
            />
          ),
        }}
      />


      {/* NOTIFICATIONS */}
      <Tab.Screen
        name="Notifications"
        component={Notifications}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "notifications" : "notifications-outline"}
              size={24}
              color={focused ? "#007bff" : "#888"}
            />
          ),
        }}
      />

      {/* PROFILE */}
      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={24}
              color={focused ? "#007bff" : "#888"}
            />
          ),
        }}
      />

    </Tab.Navigator>
  );
}