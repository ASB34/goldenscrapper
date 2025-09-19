import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { decrypt } from '@/lib/crypto';

async function publishToPrestaShop(product: any, apiKey: string, shopUrl: string) {
  try {
    console.log('🔍 PrestaShop API Publishing...');
    console.log('🔍 Shop URL:', shopUrl);
    console.log('🔍 API Key length:', apiKey?.length || 0);

    // Clean shop URL - remove protocol and trailing slash
    const cleanedShopUrl = shopUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    console.log('🔍 Cleaned Shop URL:', cleanedShopUrl);

    // Get enhanced content
    const contentData = product.aiRewrittenContent ? JSON.parse(product.aiRewrittenContent) : {};
    const title = contentData.title || product.originalTitle;
    const description = contentData.description || product.originalDescription;

    // Parse images
    let images = [];
    try {
      if (product.originalImages) {
        images = JSON.parse(product.originalImages);
      }
    } catch (e) {
      console.log('Error parsing images:', e);
    }

    // Parse pricing
    let pricing = { price: '0', comparePrice: null };
    try {
      if (product.pricing) {
        pricing = JSON.parse(product.pricing);
      }
    } catch (e) {
      console.log('Error parsing pricing:', e);
    }

    // Parse variants
    let variants = [];
    try {
      if (product.variants) {
        variants = JSON.parse(product.variants);
      }
    } catch (e) {
      console.log('Error parsing variants:', e);
    }

    // Create PrestaShop product structure
    const prestaShopProduct = {
      product: {
        name: {
          language: [
            { "@id": "1", "#text": title }
          ]
        },
        description: {
          language: [
            { "@id": "1", "#text": description }
          ]
        },
        description_short: {
          language: [
            { "@id": "1", "#text": title }
          ]
        },
        price: pricing.price || '0',
        wholesale_price: pricing.comparePrice || pricing.price || '0',
        active: "1",
        available_for_order: "1",
        show_price: "1",
        online_only: "0",
        id_category_default: "2", // Default category
        categories: {
          category: [
            { "@id": "2" } // Home category
          ]
        },
        state: "1",
        condition: "new",
        visibility: "both"
      }
    };

    console.log('📦 PrestaShop Product Structure:', JSON.stringify(prestaShopProduct, null, 2).substring(0, 500) + '...');

    // Try different API versions and endpoints
    const apiVersions = ['', '/api'];
    const productEndpoints = ['/products', '/product'];

    for (const version of apiVersions) {
      for (const endpoint of productEndpoints) {
        try {
          console.log(`🔍 Trying: https://${cleanedShopUrl}${version}${endpoint}`);

          const response = await fetch(`https://${cleanedShopUrl}${version}${endpoint}`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
              'Content-Type': 'application/xml',
              'Accept': 'application/xml'
            },
            body: convertToXML(prestaShopProduct)
          });

          console.log(`🔍 API ${version}${endpoint} response:`, response.status);
          console.log('🔍 Response Headers:', Object.fromEntries(response.headers.entries()));

          if (response.status === 201 || response.status === 200) {
            const responseText = await response.text();
            console.log('🔍 Raw response:', responseText.substring(0, 500));

            // Try to parse XML response
            try {
              const productId = extractProductIdFromXML(responseText);
              if (productId) {
                console.log('🎉 PrestaShop Product created successfully!');
                console.log('Product ID:', productId);
                
                return {
                  success: true,
                  productId: productId,
                  url: `https://${cleanedShopUrl}/index.php?id_product=${productId}&controller=product`,
                  adminUrl: `https://${cleanedShopUrl}/admin/index.php?controller=AdminProducts&id_product=${productId}`,
                  status: 'active'
                };
              }
            } catch (parseError) {
              console.log('Could not parse product ID from response');
            }

            return {
              success: true,
              productId: 'unknown',
              url: `https://${cleanedShopUrl}`,
              adminUrl: `https://${cleanedShopUrl}/admin`,
              status: 'created'
            };
          }

          if (response.status === 401) {
            throw new Error('Invalid API credentials - check API key');
          }

          if (response.status === 403) {
            throw new Error('API access forbidden - check permissions');
          }

        } catch (versionError) {
          console.error(`API ${version}${endpoint} failed:`, (versionError as Error).message);
          continue;
        }
      }
    }

    throw new Error('All PrestaShop API endpoints failed');

  } catch (error) {
    console.error('PrestaShop API Error:', error);
    return {
      success: false,
      error: `PrestaShop API Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

function convertToXML(productData: any): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product>
    <name>
      <language id="1"><![CDATA[${productData.product.name.language[0]['#text']}]]></language>
    </name>
    <description>
      <language id="1"><![CDATA[${productData.product.description.language[0]['#text']}]]></language>
    </description>
    <description_short>
      <language id="1"><![CDATA[${productData.product.description_short.language[0]['#text']}]]></language>
    </description_short>
    <price>${productData.product.price}</price>
    <wholesale_price>${productData.product.wholesale_price}</wholesale_price>
    <active>${productData.product.active}</active>
    <available_for_order>${productData.product.available_for_order}</available_for_order>
    <show_price>${productData.product.show_price}</show_price>
    <online_only>${productData.product.online_only}</online_only>
    <id_category_default>${productData.product.id_category_default}</id_category_default>
    <state>${productData.product.state}</state>
    <condition>${productData.product.condition}</condition>
    <visibility>${productData.product.visibility}</visibility>
    <categories>
      <category>
        <id>2</id>
      </category>
    </categories>
  </product>
</prestashop>`;
}

function extractProductIdFromXML(xmlResponse: string): string | null {
  try {
    const idMatch = xmlResponse.match(/<product[^>]*id="(\d+)"/);
    return idMatch ? idMatch[1] : null;
  } catch (error) {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET!);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Get product from database
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Get API keys
    const apiKeysRecord = await prisma.apiKeys.findFirst();
    
    if (!apiKeysRecord?.prestashopApiKey) {
      return NextResponse.json({ 
        error: 'PrestaShop API key not configured. Please add it in settings.' 
      }, { status: 400 });
    }

    if (!apiKeysRecord?.prestashopStoreUrl) {
      return NextResponse.json({ 
        error: 'PrestaShop store URL not configured. Please add it in settings.' 
      }, { status: 400 });
    }

    // Decrypt API key and store URL
    const apiKey = decrypt(apiKeysRecord.prestashopApiKey);
    const shopUrl = decrypt(apiKeysRecord.prestashopStoreUrl);
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Could not decrypt PrestaShop API key' 
      }, { status: 500 });
    }

    if (!shopUrl) {
      return NextResponse.json({ 
        error: 'Could not decrypt PrestaShop store URL' 
      }, { status: 500 });
    }

    // Publish to PrestaShop
    const result = await publishToPrestaShop(product, apiKey, shopUrl);

    if (result.success) {
      // Update product status
      await prisma.product.update({
        where: { id: productId },
        data: {
          isPublished: true,
          publishedTo: {
            prestashop: {
              published: true,
              publishedAt: new Date().toISOString(),
              productId: result.productId,
              url: result.url,
              adminUrl: result.adminUrl
            }
          }
        }
      });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('PrestaShop publish error:', error);
    return NextResponse.json({ 
      error: 'Failed to publish to PrestaShop: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}
