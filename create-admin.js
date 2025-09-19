const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('Creating admin user...');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: 'admin' }
    });
    
    if (existingUser) {
      console.log('Admin user already exists');
      return;
    }
    
    // Create admin user
    const user = await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword
      }
    });
    
    console.log('✅ Admin user created successfully');
    console.log('Username: admin');
    console.log('Password: admin123');
    
    // Create default API keys record
    const existingKeys = await prisma.apiKeys.findFirst();
    
    if (!existingKeys) {
      await prisma.apiKeys.create({
        data: {
          encryptionKey: crypto.randomBytes(32).toString('hex'),
          aiProvider: 'openai'
        }
      });
      console.log('✅ Default API keys record created');
    }
    
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
