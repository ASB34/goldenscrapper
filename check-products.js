const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProducts() {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        originalTitle: true,
        isProcessed: true,
        isPublished: true,
        publishedTo: true
      }
    });
    
    console.log('📦 Found', products.length, 'products in database');
    
    products.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.originalTitle}`);
      console.log(`   - ID: ${product.id}`);
      console.log(`   - Processed: ${product.isProcessed ? '✅' : '❌'}`);
      console.log(`   - Published: ${product.isPublished ? '✅' : '❌'}`);
      if (product.publishedTo) {
        console.log(`   - Published to:`, Object.keys(product.publishedTo));
      }
    });
    
  } catch (error) {
    console.error('Error checking products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();
