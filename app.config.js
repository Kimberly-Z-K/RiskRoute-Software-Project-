import "dotenv/config";

// Receives the values from app.json as `config`, so icon, splash,
// permissions, etc. are kept instead of being thrown away.
export default ({ config }) => ({
  ...config,

  ios: {
    ...config.ios,
    bundleIdentifier: "com.thapsolpsps.RiskRoute",
  },

  android: {
    ...config.android,
    package: "com.thapsolpsps.Risk_Route",
    config: {
      // react-native-maps needs the key in the native manifest on Android
      googleMaps: { apiKey: process.env.GOOGLE_MAPS_API_KEY },
    },
  },

  extra: {
    ...config.extra,
  },
});
