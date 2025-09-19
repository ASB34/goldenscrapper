const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function checkKeys() {
  try {
    const apiKeys = await prisma.apiKeys.findMany();
    
    if (apiKeys.length === 0) {
      console.log('No API keys found in database');
      return;
    }
    
    const record = apiKeys[0];
    console.log('API Keys Record:');
    console.log('- ID:', record.id);
    console.log('- Etsy API Key:', record.etsyApiKey ? 'Set' : 'Not set');
    console.log('- Shopify API Key:', record.shopifyApiKey ? 'Set' : 'Not set');
    console.log('- Shopify API Secret:', record.shopifyApiSecret ? 'Set (length: ' + (record.shopifyApiSecret?.length || 0) + ')' : 'Not set');
    console.log('- AI Provider:', record.aiProvider);
    console.log('- Created:', record.createdAt);
    
    // Try to decrypt shopify secret to see what we have
    if (record.shopifyApiSecret && record.encryptionKey) {
      try {
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(record.encryptionKey).slice(0, 32), Buffer.alloc(16));
        let decrypted = decipher.update(record.shopifyApiSecret, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        console.log('- Shopify API Secret starts with:', decrypted.substring(0, 15) + '...');
      } catch (err) {
        console.log('- Could not decrypt shopify secret:', err.message);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkKeys();
