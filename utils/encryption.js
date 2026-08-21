// import EncryptedStorage from 'react-native-encrypted-storage';

// Your secret key - keep this safe!
const ENCRYPTION_KEY = 'xK9#mP2$vL5@nQ8!wR3^tY6&uZ7*';

/**
 * Simple encryption for React Native
 * Uses XOR + Base64 - works without native crypto
 */
export const encryptData = (data) => {
  try {
    if (!data) return null;
    if (typeof data !== 'string') {
      data = String(data);
    }

    // XOR encryption
    let result = '';
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
      result += String.fromCharCode(charCode);
    }

    // Convert to Base64 for safe storage
    return btoa(result);
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
};

/**
 * Simple decryption for React Native
 */
export const decryptData = (encryptedData) => {
  try {
    if (!encryptedData) return null;

    // Decode from Base64
    const decoded = atob(encryptedData);

    // Reverse XOR
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
      result += String.fromCharCode(charCode);
    }

    return result;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

/**
 * Securely store encrypted data
 */
// export const storeSecureData = async (key, value) => {
//   try {
//     await EncryptedStorage.setItem(key, JSON.stringify(value));
//     return true;
//   } catch (error) {
//     console.error('Store error:', error);
//     return false;
//   }
// };

/**
 * Retrieve securely stored data
 */
// export const getSecureData = async (key) => {
//   try {
//     const data = await EncryptedStorage.getItem(key);
//     return data ? JSON.parse(data) : null;
//   } catch (error) {
//     console.error('Retrieve error:', error);
//     return null;
//   }
// };

/**
 * Test encryption/decryption
 */
// export const testEncryption = () => {
//   const testData = '0821234567';
//   const encrypted = encryptData(testData);
//   const decrypted = decryptData(encrypted);
  
//   console.log('🔬 Encryption Test:');
//   console.log('Original:', testData);
//   console.log('Encrypted:', encrypted);
//   console.log('Decrypted:', decrypted);
//   console.log('✅ Test Passed:', testData === decrypted);
  
//   return testData === decrypted;
// };