import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { decrypt } from '@/lib/crypto';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Find settings for user
    const settings = await prisma.apiKeys.findFirst({ where: { userId: user.id } });

    if (!settings) {
      // Return defaults
      return NextResponse.json({ settings: {
        etsyApiKey: null,
        shopifyStoreUrl: null,
        shopifyApiKey: null,
        shopifyApiSecret: null,
        shopifyWebhookSecret: null,
        prestashopApiKey: null,
        prestashopStoreUrl: null,
        openaiApiKey: null,
        zaiApiKey: null,
        aiProvider: 'openai'
      } });
    }

    // Decrypt keys for the UI (we only need to indicate presence; do not return raw keys unless necessary)
    const result: any = {
      etsyApiKey: settings.etsyApiKey ? true : false,
      shopifyStoreUrl: settings.shopifyStoreUrl ? true : false,
      shopifyApiKey: settings.shopifyApiKey ? true : false,
      shopifyApiSecret: settings.shopifyApiSecret ? true : false,
      shopifyWebhookSecret: settings.shopifyWebhookSecret ? true : false,
      prestashopApiKey: settings.prestashopApiKey ? true : false,
      prestashopStoreUrl: settings.prestashopStoreUrl || null,
      openaiApiKey: settings.openaiApiKey ? true : false,
      zaiApiKey: settings.zaiApiKey ? true : false,
      aiProvider: settings.aiProvider || 'openai'
    };

    // Check settings JSON for Shopify fields
    if (settings.settings) {
      try {
        const settingsJson = typeof settings.settings === 'string' ? 
          JSON.parse(settings.settings) : settings.settings;
        
        if (settingsJson.shopifyStoreUrl) result.shopifyStoreUrl = true;
        if (settingsJson.shopifyApiKey) result.shopifyApiKey = true;
        if (settingsJson.shopifyApiSecret) result.shopifyApiSecret = true;
        if (settingsJson.shopifyAccessToken) result.shopifyWebhookSecret = true; // Map access token to webhook secret
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    return NextResponse.json({ settings: result });
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}
