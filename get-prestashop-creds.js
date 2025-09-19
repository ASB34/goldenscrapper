const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getPrestaShopCredentials() {
  try {
    const settings = await prisma.apiKeys.findFirst();
    
    if (!settings || !settings.prestashopApiKey || !settings.prestashopStoreUrl) {
      console.log('❌ PrestaShop credentials not found');
      return null;
    }
    
    // We need to decrypt the credentials
    // For now, let's just show they exist
    console.log('✅ PrestaShop credentials found in database');
    console.log('- API Key encrypted length:', settings.prestashopApiKey.length);
    console.log('- Store URL encrypted length:', settings.prestashopStoreUrl.length);
    
    // Return the encrypted values for now
    return {
      apiKey: settings.prestashopApiKey,
      storeUrl: settings.prestashopStoreUrl
    };
    
  } catch (error) {
    console.error('Error getting credentials:', error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

getPrestaShopCredentials();
