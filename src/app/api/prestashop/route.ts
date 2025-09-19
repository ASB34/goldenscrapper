import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { PrestaShopService } from '@/lib/prestashop-service';

// PrestaShop XML API Integration for XAU-based products (Troy Ounce)
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { productId, action } = await request.json();

    switch (action) {
      case 'send-to-prestashop':
        const result = await PrestaShopService.sendToPrestaShop(productId);
        return NextResponse.json(result);

      case 'get-xau-pricing':
        const pricing = await PrestaShopService.getXauPricingSummary(productId);
        return NextResponse.json({ 
          success: true, 
          pricing 
        });

      case 'preview-xml':
        const xml = await PrestaShopService.createProductXML(productId);
        return NextResponse.json({ 
          success: true, 
          xml,
          message: 'PrestaShop XML preview generated successfully (XAU Troy Ounce pricing)'
        });

      default:
        return NextResponse.json({ 
          error: 'Invalid action. Supported actions: send-to-prestashop, get-xau-pricing, preview-xml' 
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ PrestaShop API error:', error);
    return NextResponse.json({
      error: 'PrestaShop integration failed',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ 
        error: 'Product ID is required' 
      }, { status: 400 });
    }

    const pricing = await PrestaShopService.getXauPricingSummary(productId);
    
    return NextResponse.json({ 
      success: true, 
      pricing,
      message: pricing ? 'XAU pricing (troy ounce) found' : 'No XAU pricing available'
    });

  } catch (error: any) {
    console.error('❌ PrestaShop pricing error:', error);
    return NextResponse.json({
      error: 'Failed to get XAU pricing',
      details: error.message
    }, { status: 500 });
  }
}
