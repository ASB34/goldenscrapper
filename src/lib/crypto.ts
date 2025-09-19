import * as crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-this-in-prod!!';
const ALGORITHM = 'aes-256-cbc';

// Simple Base64 encoding for development
// In production, use proper encryption service
export function encrypt(text: string): string {
  try {
    // Simple Base64 encoding with a key suffix for validation
    const encoded = Buffer.from(text + ':' + ENCRYPTION_KEY.slice(0, 8)).toString('base64');
    return encoded;
  } catch (error) {
    console.error('Encryption error:', error);
    return Buffer.from(text).toString('base64');
  }
}

export function decrypt(encryptedText: string): string {
  try {
    console.log('=== CRYPTO DECRYPT DEBUG ===');
    console.log('Input encrypted text:', encryptedText);
    console.log('Input length:', encryptedText?.length || 0);
    
    // Decode and validate
    const decoded = Buffer.from(encryptedText, 'base64').toString('utf8');
    console.log('Base64 decoded:', decoded);
    
    const parts = decoded.split(':');
    console.log('Split parts:', parts);
    console.log('Expected key slice:', ENCRYPTION_KEY.slice(0, 8));
    
    if (parts.length === 2 && parts[1] === ENCRYPTION_KEY.slice(0, 8)) {
      console.log('Valid encryption format, returning:', parts[0]);
      return parts[0]; // Return original text without reversing
    }
    
    // Fallback: just return base64 decoded
    console.log('Fallback decoding, returning:', decoded);
    return Buffer.from(encryptedText, 'base64').toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    try {
      const fallback = Buffer.from(encryptedText, 'base64').toString('utf8');
      console.log('Error fallback, returning:', fallback);
      return fallback;
    } catch {
      console.log('Complete decryption failure, returning empty string');
      return '';
    }
  }
}
