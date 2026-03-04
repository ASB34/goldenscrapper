import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { encrypt } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  try {
    // Verify PostgreSQL authentication
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { keyName, value } = await request.json();

    if (!keyName || typeof keyName !== 'string') {
      return NextResponse.json({ error: 'Key name is required' }, { status: 400 });
    }

    // Validate key name - include Shopify fields
    const validKeys = [
      'etsyApiKey',
      'etsyShopId',
      'prestashopApiKey',
      'prestashopStoreUrl',
      'openaiApiKey',
      'shopifyStoreUrl',
      'shopifyApiKey',
      'shopifyApiSecret',
      'shopifyAccessToken'
    ];

    if (!validKeys.includes(keyName)) {
      return NextResponse.json({ error: 'Invalid key name' }, { status: 400 });
    }

    // Get or create settings record for current user
    console.log('Looking for settings for user:', user.id);
    let settings = await prisma.apiKeys.findFirst({
      where: { userId: user.id }
    });
    
    console.log('Found existing settings:', !!settings);
    
    if (!settings) {
      console.log('Creating new settings record for user:', user.id);
      // Create new settings record for this user
      settings = await prisma.apiKeys.create({
        data: {
          userId: user.id,
          encryptionKey: process.env.ENCRYPTION_KEY!,
          aiProvider: 'openai'
        }
      });
      console.log('Created settings with ID:', settings.id);
    }

    // Prepare update data - handle Shopify fields via settings JSON
    const updateData: any = {};
    
    console.log('Key name:', keyName);
    console.log('Value length:', value ? value.length : 'null');
    
    // Handle Shopify fields via settings JSON field
    const shopifyFields = ['shopifyStoreUrl', 'shopifyApiKey', 'shopifyApiSecret', 'shopifyAccessToken'];
    
    if (shopifyFields.includes(keyName)) {
      // Get current settings
      const currentSettings = await prisma.apiKeys.findFirst({
        where: { userId: user.id }
      });
      
      const currentShopifySettings = currentSettings?.settings ? 
        (typeof currentSettings.settings === 'string' ? 
          JSON.parse(currentSettings.settings) : currentSettings.settings) : {};
      
      // Update the specific Shopify field
      const settingsKey = keyName.charAt(0).toLowerCase() + keyName.slice(1); // camelCase to camelCase
      if (value && value.trim()) {
        currentShopifySettings[settingsKey] = encrypt(value.trim());
      } else {
        delete currentShopifySettings[settingsKey];
      }
      
      updateData.settings = JSON.stringify(currentShopifySettings);
      console.log('Updated Shopify settings in JSON');
    } else {
      // Handle regular fields
      if (value && value.trim()) {
        // Encrypt the API key
        console.log('Encrypting API key for:', keyName);
        updateData[keyName] = encrypt(value.trim());
        console.log('Encrypted value length:', updateData[keyName].length);
      } else {
        // If empty value, set to null to clear the key
        console.log('Clearing key:', keyName);
        updateData[keyName] = null;
      }
    }

    console.log('Update data keys:', Object.keys(updateData));

    // Update the settings
    console.log('Updating settings with ID:', settings.id);
    await prisma.apiKeys.update({
      where: { id: settings.id },
      data: updateData
    });
    
    console.log('Settings updated successfully');

    return NextResponse.json({ 
      success: true, 
      message: `${keyName} updated successfully` 
    });

  } catch (error) {
    console.error('Settings update error:', error);
    
    // More detailed error reporting
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      return NextResponse.json({ 
        error: `Failed to update settings: ${error.message}`,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to update settings: Unknown error'
    }, { status: 500 });
  }
}
