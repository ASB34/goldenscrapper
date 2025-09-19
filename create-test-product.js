const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestProduct() {
  try {
    console.log('🔧 Creating test product...');
    
    const testProduct = await prisma.product.create({
      data: {
        originalTitle: 'Test Gold Bracelet - PrestaShop Integration',
        originalDescription: 'This is a test product for PrestaShop integration. Beautiful handmade gold bracelet.',
        originalKeywords: JSON.stringify(['gold', 'bracelet', 'jewelry', 'handmade']),
        pricing: JSON.stringify({
          price: '299.99',
          comparePrice: '399.99'
        }),
        specifications: JSON.stringify({
          material: 'Gold',
          weight: '15g',
          color: 'Gold'
        }),
        category: 'Jewelry',
        vendor: 'Golden Crafters',
        sku: 'TEST-GOLD-BRACELET-001',
        aiRewrittenContent: JSON.stringify({
          english: {
            title: 'Elegant 22K Gold Snake Chain Bracelet - Handcrafted Luxury Jewelry',
            description: 'Discover the epitome of elegance with this exquisite 22K gold snake chain bracelet. Meticulously handcrafted by skilled artisans, this stunning piece features a fluid snake chain design that gracefully adorns your wrist. Made from premium 22-karat gold, it offers both luxury and durability. Perfect for special occasions or everyday elegance.',
            keywords: ['22k gold bracelet', 'snake chain bracelet', 'handcrafted jewelry', 'luxury gold bracelet', 'Turkish jewelry', 'golden crafters']
          },
          turkish: {
            title: 'Zarif 22 Ayar Altın Yılan Zincir Bilezik - El İşçiliği Lüks Mücevher',
            description: 'Bu muhteşem 22 ayar altın yılan zincir bilezik ile zarafetin doruklarını keşfedin. Usta zanaatkarlar tarafından özenle el işçiliği ile üretilen bu çarpıcı parça, bileğinizi zarif bir şekilde süsleyen akışkan yılan zincir tasarımına sahiptir.',
            keywords: ['22 ayar altın bilezik', 'yılan zincir bilezik', 'el işi mücevher', 'lüks altın bilezik']
          }
        }),
        isProcessed: true,
        isPublished: false
      }
    });
    
    console.log('✅ Test product created successfully!');
    console.log('📦 Product ID:', testProduct.id);
    console.log('📝 Title:', testProduct.originalTitle);
    
    return testProduct.id;
    
  } catch (error) {
    console.error('❌ Error creating test product:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestProduct();
