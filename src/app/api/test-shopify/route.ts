import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
import axios from 'axios';

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get Shopify credentials from settings
    const settings = await prisma.apiKeys.findFirst();
    if (!settings?.shopifyApiKey || !settings?.shopifyApiSecret) {
      return NextResponse.json({ 
        error: 'Shopify credentials not configured. Please add them in Settings.' 
      }, { status: 400 });
    }

    const accessToken = decrypt(settings.shopifyApiKey);
    const storeUrl = decrypt(settings.shopifyApiSecret);
    
    // Clean store URL
    const cleanStoreUrl = storeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    console.log('Testing Shopify connection to:', cleanStoreUrl);
    
    // Test API connection by getting shop info - 2025-07 API versiyonu
    const response = await axios.get(
      `https://${cleanStoreUrl}/admin/api/2025-07/shop.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (response.status === 200 && response.data.shop) {
      const shop = response.data.shop;
      return NextResponse.json({
        success: true,
        message: 'Shopify connection successful!',
        shopInfo: {
          name: shop.name,
          domain: shop.domain,
          email: shop.email,
          currency: shop.currency,
          timezone: shop.timezone,
          plan: shop.plan_name
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid response from Shopify API'
      });
    }

  } catch (error: any) {
    console.error('Shopify test error:', error.response?.data || error.message);
    
    let errorMessage = 'Shopify connection failed';
    let details: any = {};
    
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      switch (status) {
        case 401:
          errorMessage = 'Invalid access token. Please check your Shopify credentials.';
          break;
        case 403:
          errorMessage = 'Access forbidden. Your app may not have required permissions.';
          break;
        case 404:
          errorMessage = 'Store not found. Please check your store URL.';
          break;
        case 429:
          errorMessage = 'Too many requests. Please try again later.';
          break;
        default:
          errorMessage = `HTTP ${status}: ${data?.error || data?.message || 'Unknown error'}`;
      }
      
      details = {
        status,
        data: data,
        url: error.config?.url
      };
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Store URL not found. Please check your store URL format.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timeout. Please try again.';
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: details
    });
  }
}
