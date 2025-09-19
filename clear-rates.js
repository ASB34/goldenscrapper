// Clear old XAU rates from database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearOldRates() {
  try {
    console.log('🧹 Clearing old XAU rates...');
    
    const result = await prisma.xauRates.deleteMany({
      where: {
        source: 'yahoo-finance'
      }
    });
    
    console.log(`✅ Deleted ${result.count} old Yahoo Finance rates`);
    
    // Also clear any old rates
    const result2 = await prisma.xauRates.deleteMany({
      where: {
        fetchedAt: {
          lt: new Date(Date.now() - 10 * 60 * 1000) // older than 10 minutes
        }
      }
    });
    
    console.log(`✅ Deleted ${result2.count} old rates`);
    
  } catch (error) {
    console.error('❌ Error clearing rates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearOldRates();
