import "dotenv/config";

export default {
  expo: {
    name: "Risk_Route",
    slug: "Risk_Route",
    version: "1.0.0",

    plugins: [
      "@livekit/react-native-expo-plugin",
      "@config-plugins/react-native-webrtc",
    ],

    ios: {
      bundleIdentifier: "com.thapsolpsps.RiskRoute",
    },

    android: {
      package: "com.thapsolpsps.Risk_Route",
    },

    extra: {
      googleMapsApiKey:
        process.env.GOOGLE_MAPS_API_KEY,

      eas: {
        projectId:
          "f8aa6f5a-2b1b-4781-9da1-78f504824249",
      },
    },
  },
};