// import EncryptedStorage from 'react-native-encrypted-storage';

const ENCRYPTION_KEY = 'xK9#mP2$vL5@nQ8!wR3^tY6&uZ7*';

export const encryptData = (data) => {
  try {
    if (!data) return null;
    if (typeof data !== 'string') {
      data = String(data);
    }

    let result = '';
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
      result += String.fromCharCode(charCode);
    }

    return btoa(result);
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
};


export const decryptData = (encryptedData) => {
  try {
    if (!encryptedData) return null;

    const decoded = atob(encryptedData);

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

// export const storeSecureData = async (key, value) => {
//   try {
//     await EncryptedStorage.setItem(key, JSON.stringify(value));
//     return true;
//   } catch (error) {
//     console.error('Store error:', error);
//     return false;
//   }
// };

// export const getSecureData = async (key) => {
//   try {
//     const data = await EncryptedStorage.getItem(key);
//     return data ? JSON.parse(data) : null;
//   } catch (error) {
//     console.error('Retrieve error:', error);
//     return null;
//   }
// };

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