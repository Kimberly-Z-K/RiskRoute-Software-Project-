import '@testing-library/jest-dom/vitest';

// Mock Expo/React Native modules that don't exist in the jsdom test
// environment. Add more mocks here as your test suite grows.
vi.mock('expo-constants', () => ({
  default: { expoConfig: { name: 'expo-vitest-demo' } },
}));
