// import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'xK9#mP2$vL5@nQ8!wR3^tY6&uZ7*';

// Encrypt data
export const encryptData = (data) => {
  try {
    if (!data) return null;
    const encrypted = CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
};

// Decrypt data
export const decryptData = (encryptedData) => {
  try {
    if (!encryptedData) return null;
    const decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const originalText = decrypted.toString(CryptoJS.enc.Utf8);
    return originalText;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};