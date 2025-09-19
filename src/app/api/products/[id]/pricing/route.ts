import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { XauService } from '@/lib/xau-service';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { price, comparePrice, minPrice, maxPrice, currency } = await request.json();
    
    // Build updated pricing object
    const updatedPricing = {
      price: price || null,
      comparePrice: comparePrice || null,
      minPrice: minPrice || null,
      maxPrice: maxPrice || null,
      currency: currency || 'USD',
      onSale: comparePrice && parseFloat(comparePrice) > parseFloat(price || '0'),
      priceRange: (minPrice && maxPrice) ? `${minPrice} - ${maxPrice} ${currency}` : null
    };

    // Convert to XAU
    let xauPricing = null;
    try {
      xauPricing = await XauService.convertPricingToXau(updatedPricing, currency);
      console.log('✅ XAU conversion successful:', xauPricing);
    } catch (error) {
      console.error('❌ XAU conversion failed:', error);
    }

    // Update product in database
    const updatedProduct = await prisma.product.update({
      where: { id: params.id },
      data: {
        pricing: updatedPricing as any,
        xauPricing: xauPricing as any,
        lastXauUpdate: xauPricing ? new Date() : null
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Pricing updated successfully',
      product: updatedProduct
    });

  } catch (error) {
    console.error('Error updating pricing:', error);
    return NextResponse.json({ 
      error: 'Failed to update pricing' 
    }, { status: 500 });
  }
}
