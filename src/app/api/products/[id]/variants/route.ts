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
    const { variants } = await request.json();
    
    if (!variants || !Array.isArray(variants)) {
      return NextResponse.json({ 
        error: 'Invalid variants data' 
      }, { status: 400 });
    }

    console.log('📝 Updating variant pricing for product:', params.id);
    console.log('📊 Variants count:', variants.length);

    // Process each variant to update pricing with XAU conversion
    const updatedVariants = await Promise.all(
      variants.map(async (variant: any, index: number) => {
        try {
          console.log(`🔄 Processing variant ${index + 1}:`, variant.title);
          
          // Get original pricing from variant
          let originalPricing = null;
          if (variant.originalPricing) {
            originalPricing = typeof variant.originalPricing === 'string' 
              ? JSON.parse(variant.originalPricing) 
              : variant.originalPricing;
          }

          // Create new pricing structure
          const newPricing = {
            original: originalPricing,
            usd: {
              price: variant.usdPrice || 0,
              comparePrice: variant.usdComparePrice || null
            },
            xau: variant.xauPrice || 0
          };

          // Convert USD to XAU using current rates
          if (variant.usdPrice) {
            try {
              // Get latest XAU rate for USD
              const rates = await XauService.getCachedRates(30);
              let usdRate = rates.find((r: any) => r.currency === 'USD');
              
              if (!usdRate) {
                // Fetch fresh rates if not cached
                const freshRates = await XauService.fetchLatestRates(['USD']);
                usdRate = freshRates.find((r: any) => r.currency === 'USD');
              }
              
              if (usdRate) {
                const xauPrice = XauService.convertToXau(variant.usdPrice, 'USD', usdRate.ratePerOz);
                newPricing.xau = xauPrice;
                console.log(`💰 Variant "${variant.title}" XAU conversion:`, {
                  usd: variant.usdPrice,
                  xau: xauPrice
                });
              } else {
                console.error(`❌ No XAU rate found for USD`);
              }
            } catch (error) {
              console.error(`❌ XAU conversion failed for variant "${variant.title}":`, error);
            }
          }

          return {
            ...variant,
            variantPricing: newPricing
          };
        } catch (error) {
          console.error(`❌ Error processing variant ${index + 1}:`, error);
          return variant; // Return original variant if processing fails
        }
      })
    );

    // Update product variants in database
    const updatedProduct = await prisma.product.update({
      where: { id: params.id },
      data: {
        variants: updatedVariants as any
      }
    });

    console.log('✅ Variant pricing updated successfully');

    return NextResponse.json({ 
      success: true, 
      message: 'Variant pricing updated successfully',
      product: updatedProduct
    });

  } catch (error) {
    console.error('❌ Error updating variant pricing:', error);
    return NextResponse.json({ 
      error: 'Failed to update variant pricing',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to retrieve variant pricing
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        variants: true,
        pricing: true
      }
    });

    if (!product) {
      return NextResponse.json({ 
        error: 'Product not found' 
      }, { status: 404 });
    }

    // Process variants to include pricing information
    const variantsWithPricing = (product.variants as any[])?.map((variant: any) => {
      let variantPricing = null;
      
      try {
        if (variant.variantPricing) {
          variantPricing = typeof variant.variantPricing === 'string'
            ? JSON.parse(variant.variantPricing)
            : variant.variantPricing;
        }
      } catch (error) {
        console.error('Error parsing variant pricing:', error);
      }

      return {
        ...variant,
        variantPricing
      };
    }) || [];

    return NextResponse.json({
      success: true,
      variants: variantsWithPricing,
      productPricing: product.pricing
    });

  } catch (error) {
    console.error('Error retrieving variant pricing:', error);
    return NextResponse.json({ 
      error: 'Failed to retrieve variant pricing' 
    }, { status: 500 });
  }
}
