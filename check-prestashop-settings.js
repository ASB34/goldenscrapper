const { PrismaClient } = require('@prisma/client');
const { decrypt } = require('./src/lib/crypto');

const prisma = new PrismaClient();

async function checkPrestaShopSettings() {
  try {
    const settings = await prisma.apiKeys.findFirst();
    
    if (!settings) {
      console.log('❌ No settings found in database');
      return;
    }
    
    console.log('✅ Settings found in database');
    console.log('- prestashopApiKey:', !!settings.prestashopApiKey);
    console.log('- prestashopStoreUrl:', !!settings.prestashopStoreUrl);
    
    if (settings.prestashopApiKey) {
      try {
        const decryptedKey = decrypt(settings.prestashopApiKey);
        console.log('- API Key length:', decryptedKey?.length || 0);
        console.log('- API Key starts with:', decryptedKey?.substring(0, 10) + '...');
      } catch (e) {
        console.log('❌ Could not decrypt API key:', e.message);
      }
    }
    
    if (settings.prestashopStoreUrl) {
      try {
        const decryptedUrl = decrypt(settings.prestashopStoreUrl);
        console.log('- Store URL:', decryptedUrl);
      } catch (e) {
        console.log('❌ Could not decrypt store URL:', e.message);
      }
    }
    
  } catch (error) {
    console.error('Error checking settings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPrestaShopSettings();
