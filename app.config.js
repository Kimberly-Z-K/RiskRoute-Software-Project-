import "dotenv/config";

export default {
  expo: {
    name: "Risk_Route",
    slug: "Risk_Route",
    version: "1.0.0",

    extra: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    },
  },
};