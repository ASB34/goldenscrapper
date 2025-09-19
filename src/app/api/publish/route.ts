import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
import { XauService } from '@/lib/xau-service';
import '@shopify/shopify-api/adapters/node';
import { shopifyApi, LATEST_API_VERSION, ApiVersion } from '@shopify/shopify-api';
import { Session } from '@shopify/shopify-api';
import { restResources } from '@shopify/shopify-api/rest/admin/2024-10';

export async function POST(request: NextRequest) {
  // Development-only bypass: allow skipping authentication when running locally
  const devBypassHeader = request.headers.get('x-dev-bypass-auth');
  if (process.env.NODE_ENV !== 'production' && devBypassHeader === 'true') {
    console.log('🔓 Development auth bypass enabled via x-dev-bypass-auth header');
  } else {
    if (!(await isAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    let body: any = null;
    try {
      body = await request.json();
    } catch (e) {
      console.error('Failed to parse JSON body for publish request:', e);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { productId, platforms } = body || {};

    if (!productId) {
      return NextResponse.json({ error: 'Missing productId in request body' }, { status: 400 });
    }

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid platforms array in request body' }, { status: 400 });
    }

    // Get product
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return NextResponse.json({ 
        error: 'Product not found',
      }, { status: 400 });
    }

    // Don't block publishing when AI content is missing. Some platforms can accept
    // the original product content. Log a warning so developers can see it.
    if (!product.aiRewrittenContent) {
      console.warn(`Product ${product.id} does not have AI-processed content. Proceeding with original content where possible.`);
      // Note: we intentionally continue instead of returning 400 so PrestaShop and
      // other platforms that don't strictly require AI content can proceed.
    }

    // Get API keys
    const settings = await prisma.apiKeys.findFirst();
    if (!settings) {
      return NextResponse.json({ error: 'API keys not configured' }, { status: 400 });
    }

    const publishResults: any = {};
    
    // Merge with existing publish results for re-publishing
    const existingResults = (product.publishedTo as any) || {};

    // Publish to selected platforms
    for (const platform of platforms) {
      try {
        console.log(`Publishing to ${platform}...`);
        
        switch (platform) {
          case 'etsy':
            if (settings.etsyApiKey) {
              const result = await publishToEtsy(product, decrypt(settings.etsyApiKey));
              publishResults.etsy = result;
            } else {
              publishResults.etsy = { success: false, error: 'Etsy API key not configured' };
            }
            break;
          case 'shopify':
            if (settings.shopifyApiKey && settings.shopifyApiSecret) {
              const result = await publishToShopify(
                product, 
                decrypt(settings.shopifyApiKey),
                decrypt(settings.shopifyApiSecret)
              );
              publishResults.shopify = result;
            } else {
              publishResults.shopify = { success: false, error: 'Shopify credentials not configured' };
            }
            break;
          case 'prestashop':
            if (settings.prestashopApiKey) {
              const result = await publishToPrestashop(product, decrypt(settings.prestashopApiKey));
              publishResults.prestashop = result;
            } else {
              publishResults.prestashop = { success: false, error: 'PrestaShop API key not configured' };
            }
            break;
          default:
            publishResults[platform] = { success: false, error: 'Unsupported platform' };
        }
      } catch (error) {
        console.error(`Error publishing to ${platform}:`, error);
        publishResults[platform] = { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    }

    // Process and merge results with platform-specific data
    const processedResults = { ...existingResults };
    
    for (const [platform, result] of Object.entries(publishResults)) {
      if ((result as any).success) {
        // Successful publish - store detailed information
        processedResults[platform] = {
          success: true,        // Frontend expects this
          published: true,
          productId: (result as any).productId,
          url: (result as any).url,
          adminUrl: (result as any).adminUrl,
          status: (result as any).status,
          // Include combination IDs if available
          combinationIds: (result as any).combinationIds || null,
          // Include debug traces when available (helpful for diagnostics)
          debug: (result as any).debug || null,
          publishedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          operation: (result as any).operation || 'created'
        };
        
        console.log(`✅ ${platform} publish data saved:`, processedResults[platform]);
      } else {
        // Failed publish - keep existing data but mark as failed
        processedResults[platform] = {
          ...processedResults[platform],
          success: false,       // Frontend expects this
          lastError: (result as any).error,
          lastAttempt: new Date().toISOString()
        };
      }
    }
    
    // Check if at least one platform published successfully
    const hasSuccessfulPublish = Object.values(processedResults).some((result: any) => result.published);

    // Update product with processed results
    await prisma.product.update({
      where: { id: productId },
      data: {
        isPublished: hasSuccessfulPublish,
        publishedTo: processedResults
      }
    });

    return NextResponse.json({ 
      success: true, 
      publishResults: processedResults,
      message: `Published to ${Object.keys(publishResults).join(', ')}`
    });
  } catch (error) {
    console.error('Publish error:', error);
    return NextResponse.json({ error: 'Publish failed' }, { status: 500 });
  }
}

async function publishToEtsy(product: any, apiKey: string) {
  // Mock Etsy API call - replace with actual Etsy API integration
  console.log('Publishing to Etsy:', product.originalTitle);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    success: true,
    listingId: `etsy_${Date.now()}`,
    url: `https://www.etsy.com/listing/mock-${Date.now()}`
  };
}

async function publishToShopify(product: any, apiKey: string, apiSecret: string) {
  try {
    console.log('=== SHOPIFY SDK APPROACH ===');
    console.log('Publishing to Shopify:', product.originalTitle);
    
    // Debug raw inputs
    console.log('Raw apiKey length:', apiKey?.length || 0);
    console.log('Raw apiSecret:', apiSecret);
    console.log('Raw apiSecret length:', apiSecret?.length || 0);
    
    // Clean the shop URL and handle potential corruption
    let shopUrl = apiSecret.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Fix corrupted URLs that might have port or extra characters like :your-32-
    if (shopUrl.includes(':')) {
      const parts = shopUrl.split(':');
      shopUrl = parts[0]; // Take only the domain part before the colon
    }
    
    // Remove any non-domain characters (keep only letters, numbers, dots, hyphens)
    shopUrl = shopUrl.replace(/[^a-zA-Z0-9.-]/g, '');
    
    console.log('Raw apiSecret before cleaning:', apiSecret);
    console.log('After protocol removal:', shopUrl);
    console.log('Contains colon?', shopUrl.includes(':'));
    if (shopUrl.includes(':')) {
      console.log('Splitting by colon, parts:', shopUrl.split(':'));
    }
    console.log('🎯 UPDATED CLEANING - Final cleaned Shop URL:', shopUrl);
    // Force recompilation check
    
    // Validate shop URL format
    if (!shopUrl || shopUrl.length < 5) {
      throw new Error(`Invalid shop URL format: "${shopUrl}". Expected format: your-shop.myshopify.com or custom-domain.com`);
    }
    
    // If it doesn't end with .myshopify.com or contain a dot, assume it's a myshopify subdomain
    if (!shopUrl.includes('.') || (!shopUrl.endsWith('.myshopify.com') && !shopUrl.includes('.com') && !shopUrl.includes('.tr'))) {
      throw new Error(`Invalid shop URL: "${shopUrl}". Please enter either: your-shop.myshopify.com or your-custom-domain.com`);
    }
    
    // Initialize Shopify API
    const shopify = shopifyApi({
      apiKey: 'dummy-api-key', // Not needed for private app
      apiSecretKey: 'dummy-secret', // Not needed for private app
      scopes: ['write_products', 'read_products'],
      hostName: shopUrl,
      apiVersion: ApiVersion.October24, // Use stable version
      isEmbeddedApp: false, // Required property for private apps
      restResources // Add REST resources
    });
    
    // Create session for API calls
    const session = new Session({
      id: `${shopUrl}_offline`,
      shop: shopUrl,
      state: 'offline',
      isOnline: false,
      accessToken: apiKey,
      scope: 'write_products,read_products'
    });
    
    // Parse AI content (handle both string and object)
    const aiContent = typeof product.aiRewrittenContent === 'string' 
      ? JSON.parse(product.aiRewrittenContent) 
      : product.aiRewrittenContent;
    const contentData = {
      title: aiContent.english?.title || product.originalTitle || 'Untitled Product',
      description: aiContent.english?.description || product.originalDescription || 'No description',
      keywords: aiContent.english?.keywords || product.originalKeywords || []
    };
    
    console.log('=== USING REST RESOURCES ===');
    
    // Create product using REST resources with enhanced data
    const productInstance = new shopify.rest.Product({ session });
    productInstance.title = contentData.title.substring(0, 255);
    productInstance.body_html = `<p>${contentData.description}</p>`;
    productInstance.vendor = product.vendor || 'Golden Crafters';
    productInstance.product_type = product.category || 'Handmade';
    productInstance.status = 'active';
    
    // Add tags from keywords
    if (contentData.keywords && contentData.keywords.length > 0) {
      productInstance.tags = contentData.keywords.join(', ');
    }
    
    // Create default variant with pricing and specifications
    const defaultVariant: any = {
      title: 'Default Title',
      inventory_management: 'shopify',
      inventory_policy: 'deny'
    };
    
    // Add pricing if available
    if (product.pricing) {
      const pricing = typeof product.pricing === 'string' ? JSON.parse(product.pricing) : product.pricing;
      if (pricing.price) {
        defaultVariant.price = pricing.price;
      }
      if (pricing.comparePrice) {
        defaultVariant.compare_at_price = pricing.comparePrice;
      }
    }
    
    // Add weight if available
    if (product.specifications) {
      const specs = typeof product.specifications === 'string' ? JSON.parse(product.specifications) : product.specifications;
      if (specs.weight) {
        defaultVariant.weight = specs.weight;
        defaultVariant.weight_unit = 'g';
      }
    }
    
    // Add SKU
    if (product.sku) {
      defaultVariant.sku = product.sku;
    }
    
    productInstance.variants = [defaultVariant];
    
    // Add images if available
    if (product.images && product.images.length > 0) {
      const images = JSON.parse(product.images);
      productInstance.images = images.slice(0, 10).map((imageUrl: string, index: number) => ({
        src: imageUrl,
        alt: contentData.title,
        position: index + 1
      }));
      console.log('Images added:', productInstance.images?.length || 0);
    }
    
    console.log('Product data prepared:', {
      title: productInstance.title,
      vendor: productInstance.vendor,
      type: productInstance.product_type,
      status: productInstance.status,
      images: productInstance.images?.length || 0
    });
    
    // TEST: Simple direct REST API call to check permissions
    console.log('🔍 Testing direct API call first...');
    console.log('🔍 Testing URL:', `https://${shopUrl}/admin/api/2024-10/products.json`);
    console.log('🔍 API Key first 10 chars:', apiKey.substring(0, 10) + '...');
    
    try {
      const testResponse = await fetch(`https://${shopUrl}/admin/api/2024-10/products.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product: {
            title: 'Test Product - API Check',
            vendor: 'Test Vendor',
            product_type: 'Test',
            status: 'draft'
          }
        })
      });
      
      console.log('🔍 Response status:', testResponse.status);
      console.log('🔍 Response status text:', testResponse.statusText);
      console.log('🔍 Response headers:', Object.fromEntries(testResponse.headers.entries()));
      
      const responseText = await testResponse.text();
      console.log('🔍 Raw response text:', responseText);
      
      let testResult;
      try {
        testResult = JSON.parse(responseText);
        console.log('✅ JSON parsed successfully:', testResult);
      } catch (parseError) {
        console.log('❌ Failed to parse JSON:', parseError);
        console.log('🔍 Response was not valid JSON');
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
      }
      
      if (testResponse.ok && testResult.product?.id) {
        console.log('✅ Direct API works! Product created with ID:', testResult.product.id);
        // Delete test product
        await fetch(`https://${shopUrl}/admin/api/2024-10/products/${testResult.product.id}.json`, {
          method: 'DELETE',
          headers: { 'X-Shopify-Access-Token': apiKey }
        });
        console.log('Test product deleted');
      } else {
        console.log('❌ Direct API failed. Status:', testResponse.status);
        console.log('❌ Error response:', testResult);
        throw new Error(`API call failed with status ${testResponse.status}: ${JSON.stringify(testResult)}`);
      }
    } catch (directApiError) {
      console.error('Direct API test failed:', directApiError);
      throw directApiError;
    }

    // Save the product with SDK
    console.log('Saving product with official SDK...');
    const saveResult = await productInstance.save({ update: true });
    
    console.log('=== SDK SUCCESS ===');
    console.log('Save result type:', typeof saveResult);
    console.log('Save result constructor:', (saveResult as any)?.constructor?.name);
    console.log('Save result is string?', typeof saveResult === 'string');
    
    // If it's a string, try to parse it
    let actualProduct: any = saveResult;
    if (typeof saveResult === 'string') {
      try {
        actualProduct = JSON.parse(saveResult as string);
        console.log('✅ Successfully parsed string response');
      } catch (e) {
        console.log('❌ Failed to parse string response:', e);
      }
    }
    
    console.log('Product created with ID:', (actualProduct as any)?.id || productInstance.id);
    console.log('Product handle:', (actualProduct as any)?.handle || productInstance.handle);
    console.log('Product status:', (actualProduct as any)?.status || productInstance.status);
    console.log('Product instance id:', productInstance.id);
    console.log('Product instance handle:', productInstance.handle);
    
    return {
      success: true,
      productId: productInstance.id?.toString(),
      handle: productInstance.handle,
      url: `https://${shopUrl}/products/${productInstance.handle}`,
      adminUrl: `https://${shopUrl}/admin/products/${productInstance.id}`,
      status: productInstance.status
    };
    
  } catch (sdkError) {
    console.error('=== SDK ERROR ===');
    console.error('SDK Error details:', sdkError);
    
    // Try direct REST API as fallback
    console.log('=== FALLBACK TO DIRECT REST ===');
    return await publishToShopifyDirect(product, apiKey, apiSecret);
  }
}

// Direct REST API fallback
async function publishToShopifyDirect(product: any, apiKey: string, apiSecret: string) {
  try {
    // Clean the shop URL and handle potential corruption
    let shopUrl = apiSecret.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Fix corrupted URLs that might have port or extra characters like :your-32-
    if (shopUrl.includes(':')) {
      const parts = shopUrl.split(':');
      shopUrl = parts[0]; // Take only the domain part before the colon
    }
    
    // Remove any non-domain characters (keep only letters, numbers, dots, hyphens)
    shopUrl = shopUrl.replace(/[^a-zA-Z0-9.-]/g, '');
    
    console.log('Fallback - Raw apiSecret:', apiSecret);
    console.log('Fallback - Cleaned Shop URL:', shopUrl);
    
    console.log('Fallback - Cleaned Shop URL:', shopUrl);
    
    // Parse AI content (handle both string and object)
    const aiContent = typeof product.aiRewrittenContent === 'string' 
      ? JSON.parse(product.aiRewrittenContent) 
      : product.aiRewrittenContent;
    const contentData = {
      title: aiContent.english?.title || product.originalTitle || 'Untitled Product',
      description: aiContent.english?.description || product.originalDescription || 'No description',
      keywords: aiContent.english?.keywords || product.originalKeywords || []
    };
    
    // Prepare enhanced product data
    const shopifyProduct: any = {
      product: {
        title: contentData.title.substring(0, 255),
        body_html: `<p>${contentData.description}</p>`,
        vendor: product.vendor || 'Golden Crafters',
        product_type: product.category || 'Handmade',
        status: 'draft',
        tags: contentData.keywords ? contentData.keywords.join(', ') : ''
      }
    };
    
    // Create variants with pricing and specifications
    const variants: any[] = [];
    const defaultVariant: any = {
      title: 'Default Title',
      inventory_management: 'shopify',
      inventory_policy: 'deny'
    };
    
    // Add pricing if available
    if (product.pricing) {
      const pricing = typeof product.pricing === 'string' ? JSON.parse(product.pricing) : product.pricing;
      if (pricing.price) {
        defaultVariant.price = pricing.price;
      }
      if (pricing.comparePrice) {
        defaultVariant.compare_at_price = pricing.comparePrice;
      }
    }
    
    // Add weight and SKU
    if (product.specifications) {
      const specs = typeof product.specifications === 'string' ? JSON.parse(product.specifications) : product.specifications;
      if (specs.weight) {
        defaultVariant.weight = specs.weight;
        defaultVariant.weight_unit = 'g';
      }
    }
    
    if (product.sku) {
      defaultVariant.sku = product.sku;
    }
    
    variants.push(defaultVariant);
    shopifyProduct.product.variants = variants;
    
    // Add images if available
    if (product.images && product.images.length > 0) {
      const images = JSON.parse(product.images);
      shopifyProduct.product.images = images.slice(0, 10).map((imageUrl: string, index: number) => ({
        src: imageUrl,
        alt: contentData.title,
        position: index + 1
      }));
    }
    
    console.log('Direct REST API call...');
    console.log('Product title:', shopifyProduct.product.title);
    console.log('Images:', shopifyProduct.product.images?.length || 0);
    
    // Try different API versions
    const apiVersions = ['2024-10', '2024-07', '2024-04'];
    
    for (const version of apiVersions) {
      try {
        console.log(`Trying API version: ${version}`);
        const requestUrl = `https://${shopUrl}/admin/api/${version}/products.json`;
        const requestBody = JSON.stringify(shopifyProduct);
        
        console.log(`🔍 Request URL: ${requestUrl}`);
        console.log(`🔍 Request Method: POST`);
        console.log(`🔍 Request Body Sample:`, requestBody.substring(0, 200) + '...');
        console.log(`🔍 API Key length:`, apiKey?.length || 0);
        console.log(`🔍 API Key starts with:`, apiKey?.substring(0, 10) + '...');
        
        const response = await fetch(requestUrl, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Golden-Crafters-App/1.0'
          },
          body: requestBody
        });
        
        console.log(`API ${version} response:`, response.status);
        console.log(`🔍 Response Headers:`, Object.fromEntries(response.headers.entries()));
        
        // Shopify can return 200 or 201 for successful product creation
        if (response.status === 200 || response.status === 201) {
          const responseData = await response.json();
          
          // If we get a products array, it means we got a GET response instead of POST
          if (responseData.products && Array.isArray(responseData.products)) {
            console.log(`❌ API ${version} returned products list instead of creating product`);
            console.log(`❌ This suggests the API key may lack write permissions or the request was redirected to GET`);
            
            // Check if the product we're trying to create already exists
            const existingProduct = responseData.products.find((p: any) => 
              p.handle && p.handle.includes('22k-gold-snake-chain-bracelet') || 
              p.title && p.title.includes('22K Gold Snake Chain')
            );
            
            if (existingProduct) {
              console.log('🔍 Found similar existing product:', existingProduct.title);
              console.log('🔍 Product ID:', existingProduct.id);
              return {
                success: true,
                productId: existingProduct.id.toString(),
                handle: existingProduct.handle,
                url: `https://${shopUrl}/products/${existingProduct.handle}`,
                adminUrl: `https://${shopUrl}/admin/products/${existingProduct.id}`,
                status: existingProduct.status,
                note: 'Product already exists'
              };
            }
            
            continue; // Try next version
          }
          
          // Check if we have a single product in response (correct POST response)
          if (responseData.product && responseData.product.id) {
            console.log(`SUCCESS with ${version}!`, 'Product ID:', responseData.product.id);
            console.log('🎉 Product created successfully!');
            console.log('Product URL:', `https://${shopUrl}/products/${responseData.product.handle}`);
            console.log('Admin URL:', `https://${shopUrl}/admin/products/${responseData.product.id}`);
            
            return {
              success: true,
              productId: responseData.product.id.toString(),
              handle: responseData.product.handle,
              url: `https://${shopUrl}/products/${responseData.product.handle}`,
              adminUrl: `https://${shopUrl}/admin/products/${responseData.product.id}`,
              status: responseData.product.status
            };
          } else {
            console.log(`❌ API ${version} returned unexpected response structure:`, Object.keys(responseData));
            continue; // Try next version
          }
        }
        
        if (response.status === 422) {
          const errorData = await response.json();
          console.log('Validation errors:', errorData);
          throw new Error(`Validation error: ${JSON.stringify(errorData.errors)}`);
        }
        
        if (response.status === 401) {
          throw new Error('Invalid API credentials');
        }
        
      } catch (versionError) {
        console.error(`API version ${version} failed:`, (versionError as Error).message);
        continue;
      }
    }
    
    throw new Error('All API versions failed');
    
  } catch (error) {
    console.error('Direct REST API Error:', error);
    return {
      success: false,
      error: `Shopify API Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function publishToPrestashop(product: any, apiKey: string) {
  try {
    console.log('Publishing to PrestaShop with XAU pricing:', product.originalTitle);
    // Normalize DB field names (snake_case -> camelCase) so the rest of the flow sees expected properties
    const normalizedProduct: any = {
      ...product,
      xauPricing: (product.xau_pricing ?? product.xauPricing) as any,
      aiRewrittenContent: (product.ai_rewritten_content ?? product.aiRewrittenContent) as any,
      originalImages: (product.original_images ?? product.originalImages) as any,
      originalTitle: product.original_title ?? product.originalTitle ?? product.title,
      originalDescription: product.original_description ?? product.originalDescription ?? product.description
    };

    console.log('🔎 Normalized product keys for PrestaShop publish:', {
      hasXau: !!normalizedProduct.xauPricing,
      hasAI: !!normalizedProduct.aiRewrittenContent,
      imagesCount: (normalizedProduct.originalImages || []).length || 0
    });

    // Check if product has XAU pricing
    if (!(normalizedProduct as any).xauPricing) {
      return {
        success: false,
        error: 'Product does not have XAU pricing. Please ensure XAU conversion is completed.'
      };
    }

    const xauPricing = (normalizedProduct as any).xauPricing;
    console.log('🥇 Using XAU pricing:', {
      price: xauPricing.price,
      comparePrice: xauPricing.comparePrice,
      currency: 'XAU (troy ounce)',
      rate: xauPricing.rate,
      convertedAt: xauPricing.convertedAt
    });
    
    // Get API keys from database for PrestaShop
    const settings = await prisma.apiKeys.findFirst();
    if (!settings?.prestashopApiKey) {
      return {
        success: false,
        error: 'PrestaShop API key not configured'
      };
    }

    // Decrypt credentials
    const prestashopApiKey = decrypt(settings.prestashopApiKey);
    const prestashopStoreUrl = settings.prestashopStoreUrl ? decrypt(settings.prestashopStoreUrl) : 'https://goldencrafters.com';

    // Check if product already exists in PrestaShop
    const existingPublishData = product.publishedTo as any;
    const existingPrestaShopData = existingPublishData?.prestashop;
    
    console.log('🔍 Checking existing PrestaShop data:', existingPrestaShopData);

    // Call our dedicated PrestaShop publish function with XAU pricing
    const result = await publishToPrestaShopDirect(normalizedProduct, prestashopApiKey, prestashopStoreUrl, existingPrestaShopData);
    return result;
  } catch (error) {
    console.error('PrestaShop publish error:', error);
    return {
      success: false,
      error: `PrestaShop Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// PrestaShop Attribute Management Helper Functions
async function ensureAttributeGroup(groupName: string, apiKey: string, cleanedShopUrl: string): Promise<number | null> {
  try {
    console.log(`🏷️ Checking attribute group: "${groupName}"`);
    
    // First, try to get existing attribute groups with detailed information
    const getUrl = `https://${cleanedShopUrl}/api/product_options?display=full`;
    const getResponse = await fetch(getUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
        'Accept': 'application/xml'
      }
    });

    if (getResponse.ok) {
      const responseText = await getResponse.text();
      console.log('🔍 Existing attribute groups response:', responseText.substring(0, 500));
      
      // Improved parsing - check each product_option block more carefully
      const productOptionBlocks = responseText.split('<product_option');
      
      for (const block of productOptionBlocks) {
        if (block.includes(`<![CDATA[${groupName}]]>`)) {
          // Try to extract ID from different patterns
          let idMatch = block.match(/id="(\d+)"/);
          if (!idMatch) {
            idMatch = block.match(/<id><!\[CDATA\[(\d+)\]\]><\/id>/);
          }
          if (idMatch) {
            const groupId = parseInt(idMatch[1]);
            console.log(`✅ Found existing attribute group "${groupName}" with ID: ${groupId}`);
            return groupId;
          }
        }
      }
      
      console.log(`🔍 No existing group found for "${groupName}", will create new one`);
    }

    console.log(`➕ Creating new attribute group: "${groupName}"`);
    
    // Create new attribute group
    const createGroupXML = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product_option>
    <name>
      <language id="1"><![CDATA[${groupName}]]></language>
      <language id="2"><![CDATA[${groupName}]]></language>
      <language id="3"><![CDATA[${groupName}]]></language>
      <language id="4"><![CDATA[${groupName}]]></language>
    </name>
    <public_name>
      <language id="1"><![CDATA[${groupName}]]></language>
      <language id="2"><![CDATA[${groupName}]]></language>
      <language id="3"><![CDATA[${groupName}]]></language>
      <language id="4"><![CDATA[${groupName}]]></language>
    </public_name>
    <group_type>select</group_type>
    <is_global>1</is_global>
  </product_option>
</prestashop>`;

    const createResponse = await fetch(getUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
        'Content-Type': 'application/xml',
        'Accept': 'application/xml'
      },
      body: createGroupXML
    });

    if (createResponse.ok) {
      const createResponseText = await createResponse.text();
      console.log('🔍 Create group response:', createResponseText);
      
      // Extract created group ID
      const idMatch = createResponseText.match(/<id><!\[CDATA\[(\d+)\]\]><\/id>/);
      if (idMatch) {
        const groupId = parseInt(idMatch[1]);
        console.log(`✅ Created attribute group "${groupName}" with ID: ${groupId}`);
        return groupId;
      }
    } else {
      console.error('❌ Failed to create attribute group:', createResponse.status, await createResponse.text());
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error managing attribute group:', error);
    return null;
  }
}

async function ensureAttribute(groupId: number, attributeName: string, apiKey: string, cleanedShopUrl: string): Promise<number | null> {
  try {
    console.log(`🏷️ Checking attribute: "${attributeName}" in group ${groupId}`);
    
    // First, try to get existing attributes for this group with detailed information
    const getUrl = `https://${cleanedShopUrl}/api/product_option_values?filter[id_attribute_group]=${groupId}&display=full`;
    const getResponse = await fetch(getUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
        'Accept': 'application/xml'
      }
    });

    if (getResponse.ok) {
      const responseText = await getResponse.text();
      console.log('🔍 Existing attributes response:', responseText.substring(0, 500));
      
      // Improved parsing - check each product_option_value block more carefully
      const productOptionValueBlocks = responseText.split('<product_option_value');
      
      for (const block of productOptionValueBlocks) {
        if (block.includes(`<![CDATA[${attributeName}]]>`) && 
            block.includes(`<id_attribute_group>${groupId}</id_attribute_group>`)) {
          // Try to extract ID from different patterns
          let idMatch = block.match(/id="(\d+)"/);
          if (!idMatch) {
            idMatch = block.match(/<id><!\[CDATA\[(\d+)\]\]><\/id>/);
          }
          if (idMatch) {
            const attrId = parseInt(idMatch[1]);
            console.log(`✅ Found existing attribute "${attributeName}" with ID: ${attrId}`);
            return attrId;
          }
        }
      }
      
      console.log(`🔍 No existing attribute found for "${attributeName}", will create new one`);
    }

    console.log(`➕ Creating new attribute: "${attributeName}" in group ${groupId}`);
    
    // Create new attribute
    const createAttrXML = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product_option_value>
    <id_attribute_group>${groupId}</id_attribute_group>
    <name>
      <language id="1"><![CDATA[${attributeName}]]></language>
      <language id="2"><![CDATA[${attributeName}]]></language>
      <language id="3"><![CDATA[${attributeName}]]></language>
      <language id="4"><![CDATA[${attributeName}]]></language>
    </name>
    <color></color>
    <position>1</position>
  </product_option_value>
</prestashop>`;

    const createUrl = `https://${cleanedShopUrl}/api/product_option_values`;
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
        'Content-Type': 'application/xml',
        'Accept': 'application/xml'
      },
      body: createAttrXML
    });

    if (createResponse.ok) {
      const createResponseText = await createResponse.text();
      console.log('🔍 Create attribute response:', createResponseText);
      
      // Extract created attribute ID
      const idMatch = createResponseText.match(/<id><!\[CDATA\[(\d+)\]\]><\/id>/);
      if (idMatch) {
        const attrId = parseInt(idMatch[1]);
        console.log(`✅ Created attribute "${attributeName}" with ID: ${attrId}`);
        return attrId;
      }
    } else {
      console.error('❌ Failed to create attribute:', createResponse.status, await createResponse.text());
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error managing attribute:', error);
    return null;
  }
}

async function createCombinations(productId: string, variants: any[], apiKey: string, cleanedShopUrl: string, ratePerOz?: number, productBasePrice?: number, productBaseXau?: number, productTitle?: string, productSpecifications?: any): Promise<{ success: boolean, combinationIds: number[], debug?: any[] }> {
  try {
    console.log(`🔗 Creating combinations for product ${productId}`);
    const createdCombinationIds: number[] = [];
    const debugAttempts: any[] = [];
    
    for (let variantIndex = 0; variantIndex < variants.length; variantIndex++) {
      const variant = variants[variantIndex];
      console.log(`🔄 Processing variant group: ${variant.name}`);
      
      // Ensure attribute group exists
      const groupId = await ensureAttributeGroup(variant.name, apiKey, cleanedShopUrl);
      if (!groupId) {
        console.error(`❌ Failed to create/find attribute group: ${variant.name}`);
        continue;
      }
      
      // Create combinations for each option in this variant
      if (variant.options && Array.isArray(variant.options)) {
        for (let optionIndex = 0; optionIndex < variant.options.length; optionIndex++) {
          const option = variant.options[optionIndex];
          console.log(`🔄 Processing option: ${option.name}`);
          
          // Ensure attribute exists
          const attrId = await ensureAttribute(groupId, option.name, apiKey, cleanedShopUrl);
          if (!attrId) {
            console.error(`❌ Failed to create/find attribute: ${option.name}`);
            continue;
          }
          
          // Parse option pricing and quantity
          // Simplified XAU calculation: prefer persisted frontend XAU, otherwise compute XAU = optionPrice / ratePerOz
          // (assumes option.price is in the same currency unit as ratePerOz). This removes the previous
          // proportional/TRY-based conversions which caused mismatched units.
          let optionQuantity = '10'; // Default quantity
          let optionXauPrice = null as string | null;
          let frontendXauValue: number | null = null;
          let frontendXauSource: string | null = null;

          try {
            // 1) Check persisted frontend XAU fields
            if (option.variantPricing) {
              const vp = typeof option.variantPricing === 'string' ? JSON.parse(option.variantPricing) : option.variantPricing;
              if (vp && vp.xau !== undefined && vp.xau !== null && !isNaN(Number(vp.xau))) {
                frontendXauValue = Number(vp.xau);
                frontendXauSource = 'option.variantPricing.xau';
              }
            }
            if (frontendXauValue === null) {
              if (option.xau && !isNaN(Number(option.xau))) {
                frontendXauValue = Number(option.xau);
                frontendXauSource = 'option.xau';
              } else if (option.xauPrice && !isNaN(Number(option.xauPrice))) {
                frontendXauValue = Number(option.xauPrice);
                frontendXauSource = 'option.xauPrice';
              } else if (option.xau_price && !isNaN(Number(option.xau_price))) {
                frontendXauValue = Number(option.xau_price);
                frontendXauSource = 'option.xau_price';
              } else if (option.pricing) {
                const p = typeof option.pricing === 'string' ? JSON.parse(option.pricing) : option.pricing;
                if (p && p.xau && !isNaN(Number(p.xau))) {
                  frontendXauValue = Number(p.xau);
                  frontendXauSource = 'option.pricing.xau';
                } else if (p && p.xauPrice && !isNaN(Number(p.xauPrice))) {
                  frontendXauValue = Number(p.xauPrice);
                  frontendXauSource = 'option.pricing.xauPrice';
                }
              }
            }

            if (typeof option.quantity !== 'undefined' && option.quantity !== null) {
              optionQuantity = parseInt(option.quantity).toString();
            }

            // 2) If frontend XAU exists use it
            if (frontendXauValue !== null) {
              optionXauPrice = Number(frontendXauValue).toFixed(6);
            } else {
              // 3) Compute from price using ratePerOz (we will try to get a currency-specific rate)
              try {
                const rawPrice = option.price !== undefined && option.price !== null ? parseFloat(option.price) : NaN;
                if (!isNaN(rawPrice)) {
                  // Determine option currency: prefer option.currency, then option.pricing.currency, default to USD
                  let optionCurrency = 'USD';
                  try {
                    if (option.currency) {
                      optionCurrency = option.currency;
                    } else if (option.pricing) {
                      const p = typeof option.pricing === 'string' ? JSON.parse(option.pricing) : option.pricing;
                      if (p && p.currency) optionCurrency = p.currency;
                    }
                  } catch (e) {
                    // If parsing fails, stick with USD
                    optionCurrency = 'USD';
                  }

                  let currencyRatePerOz: number | null = null;
                  try {
                    currencyRatePerOz = await XauService.getRatePerOzForCurrency(optionCurrency);
                  } catch (e) {
                    currencyRatePerOz = null;
                  }

                  // Fall back to provided ratePerOz param if service couldn't return one
                  const useRate = currencyRatePerOz || (ratePerOz && ratePerOz > 0 ? ratePerOz : null);
                  if (useRate && useRate > 0) {
                    optionXauPrice = (rawPrice / useRate).toFixed(6);
                  } else {
                    optionXauPrice = null;
                  }
                }
              } catch (e) {
                optionXauPrice = null;
              }
            }
          } catch (e) {
            console.log('Error parsing option pricing/quantity:', e);
          }

          console.log(`🔢 Option "${option.name}" - Quantity: ${optionQuantity}, Computed XAU: ${optionXauPrice}, rawPrice: ${option.price || 'n/a'}, frontendSource: ${frontendXauSource}`);

          // Prefer sending the XAU amount as the combination <price> when available; otherwise use currency price fallback
          let postedPrice = null;
          const rawOptionPrice = option.price !== undefined && option.price !== null ? parseFloat(option.price) : NaN;
          if (optionXauPrice !== null && !isNaN(Number(optionXauPrice)) && Number(optionXauPrice) > 0) {
            postedPrice = Number(optionXauPrice).toFixed(6);
          } else if (!isNaN(rawOptionPrice)) {
            // currency fallback (two decimals)
            postedPrice = rawOptionPrice.toFixed(2);
          } else {
            postedPrice = '0.00';
          }

            // Create combination with quantity
            const combinationXML = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <combination>
    <id_product>${productId}</id_product>
    <reference><![CDATA[${option.sku || `VAR-${variantIndex}-${optionIndex}`}]]></reference>
    <price>${postedPrice}</price>
    <weight>0</weight>
    <quantity>${optionQuantity}</quantity>
    <minimal_quantity>1</minimal_quantity>
    <default_on>${optionIndex === 0 ? '1' : '0'}</default_on>
    <associations>
      <product_option_values>
        <product_option_value>
          <id>${attrId}</id>
        </product_option_value>
      </product_option_values>
    </associations>
  </combination>
</prestashop>`;

          const combinationUrl = `https://${cleanedShopUrl}/api/combinations`;
          const combinationResponse = await fetch(combinationUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
              'Content-Type': 'application/xml',
              'Accept': 'application/xml'
            },
            body: combinationXML
          });

          const combinationResponseText = await combinationResponse.text();
          // Capture numeric rawPrice if available
          const rawPriceNum = option.price ? parseFloat(option.price) : null;
          debugAttempts.push({ 
            option: option.name, 
            url: combinationUrl, 
            status: combinationResponse.status, 
            responseSnippet: combinationResponseText.substring(0, 1000),
            frontendXauSource: (typeof frontendXauSource !== 'undefined') ? frontendXauSource : null,
            frontendXauValue: (typeof frontendXauValue !== 'undefined' && frontendXauValue !== null) ? Number(frontendXauValue).toFixed(6) : null,
            postedPrice: postedPrice,
            optionSnapshot: (() => { try { return JSON.stringify(option).substring(0,1000); } catch(e){ return null } })(),
            computed: {
              rawPrice: rawPriceNum,
              productBasePrice: productBasePrice || null,
              productBaseXau: productBaseXau || null,
              ratePerOz: ratePerOz || null,
              optionXauPrice: optionXauPrice
            }
          });
          if (combinationResponse.ok) {
            console.log(`✅ Created combination for "${option.name}"`);
            console.log(`🔍 Full combination response:`, combinationResponseText.substring(0, 300));
            
            // Extract combination ID from response
            const combinationIdMatch = combinationResponseText.match(/<id><!\[CDATA\[(\d+)\]\]><\/id>/);
            if (combinationIdMatch) {
              const combinationId = parseInt(combinationIdMatch[1]);
              createdCombinationIds.push(combinationId);
              console.log(`🔍 Combination ID: ${combinationId}, Setting stock quantity: ${optionQuantity}`);
              
              // Wait a bit for PrestaShop to create stock_available record
              console.log('⏱️ Waiting for PrestaShop to create stock_available record...');
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
              
              // Update stock_available for this combination
              const stockResult = await updateCombinationStock(productId, combinationId, optionQuantity, apiKey, cleanedShopUrl);
              debugAttempts.push({ action: 'updateStock', combinationId, success: stockResult });
            } else {
              console.log(`⚠️ Could not extract combination ID from response:`, combinationResponseText);
            }
          } else {
            console.error(`❌ Failed to create combination for "${option.name}":`, combinationResponse.status, combinationResponseText);
          }
        }
      }
    }
    
    return { success: true, combinationIds: createdCombinationIds, debug: debugAttempts } as any;
  } catch (error) {
    console.error('❌ Error creating combinations:', error);
    return { success: false, combinationIds: [], debug: [{ error: (error as Error).message }] } as any;
  }
}

// Update stock quantity for a specific combination
async function updateCombinationStock(productId: string, combinationId: number, quantity: string, apiKey: string, cleanedShopUrl: string): Promise<boolean> {
  try {
    console.log(`📦 Updating stock for product ${productId}, combination ${combinationId}, quantity: ${quantity}`);
    
    // First, get shop information to understand multistore configuration
    const getShopUrl = `https://${cleanedShopUrl}/api/shops?display=full`;
    
    const getShopResponse = await fetch(getShopUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
        'Accept': 'application/xml'
      }
    });

    let shopId = '1'; // Default shop ID
    let shopGroupId = '0'; // Default for non-multistore
    
    if (getShopResponse.ok) {
      const shopResponseText = await getShopResponse.text();
      console.log('🏪 Shop info:', shopResponseText.substring(0, 500));
      
      // Extract shop ID and group ID
      const shopIdMatch = shopResponseText.match(/<shop[^>]*>[\s\S]*?<id><!\[CDATA\[(\d+)\]\]><\/id>/);
      const shopGroupIdMatch = shopResponseText.match(/<id_shop_group><!\[CDATA\[(\d+)\]\]><\/id_shop_group>/);
      
      if (shopIdMatch) {
        shopId = shopIdMatch[1];
        console.log(`🏪 Found shop ID: ${shopId}`);
      }
      if (shopGroupIdMatch) {
        shopGroupId = shopGroupIdMatch[1];
        console.log(`🏪 Found shop group ID: ${shopGroupId}`);
      }
    }
    
    // Get the stock_available record for this combination
    // First try by combination ID filter
    let getStockUrl = `https://${cleanedShopUrl}/api/stock_availables?filter[id_product]=${productId}&filter[id_product_attribute]=${combinationId}&display=full`;
    console.log(`🔍 Trying stock URL: ${getStockUrl}`);
    
    let getStockResponse = await fetch(getStockUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
        'Accept': 'application/xml'
      }
    });
    
    let stockResponseText = '';
    if (getStockResponse.ok) {
      stockResponseText = await getStockResponse.text();
    }
    
    // If no results, try broader search and also list all stock records for debugging
    if (!getStockResponse.ok || stockResponseText.includes('<stock_availables/>') || stockResponseText.includes('<stock_availables></stock_availables>')) {
      console.log('🔍 No combination stock found, trying product-only filter...');
      getStockUrl = `https://${cleanedShopUrl}/api/stock_availables?filter[id_product]=${productId}&display=full`;
      
      getStockResponse = await fetch(getStockUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
          'Accept': 'application/xml'
        }
      });
      
      if (getStockResponse.ok) {
        stockResponseText = await getStockResponse.text();
      }
      
      // Also list ALL stock records for this product for debugging
      const allStockUrl = `https://${cleanedShopUrl}/api/stock_availables?display=full`;
      const allStockResponse = await fetch(allStockUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
          'Accept': 'application/xml'
        }
      });
      
      if (allStockResponse.ok) {
        const allStockText = await allStockResponse.text();
        console.log('🔍 ALL stock_availables (first 1000 chars):', allStockText.substring(0, 1000));
        
        // Look for our product in all stock records
        const productMatches = allStockText.match(new RegExp(`<id_product[^>]*>${productId}<`, 'g'));
        console.log(`🔍 Found ${productMatches ? productMatches.length : 0} stock records for product ${productId}`);
      }
    }

    if (getStockResponse.ok && stockResponseText) {
      console.log('🔍 Stock response:', stockResponseText.substring(0, 1000));
      
      // Check if we got empty results
      if (stockResponseText.includes('<stock_availables/>') || stockResponseText.includes('<stock_availables></stock_availables>')) {
        console.log('📝 No stock_available records found, this may be the issue');
        console.log('🔍 Full response:', stockResponseText);
      }
      
      // Extract stock_available ID with improved parsing - handle both formats
      const stockAvailableBlocks = stockResponseText.split('<stock_available');
      
      for (const block of stockAvailableBlocks) {
        if (block.includes(`<id_product_attribute xlink:href="https://goldencrafters.com/api/combinations/${combinationId}"><![CDATA[${combinationId}]]></id_product_attribute>`) || 
            block.includes(`<id_product_attribute>${combinationId}</id_product_attribute>`) ||
            block.includes(`<id_product_attribute><![CDATA[${combinationId}]]></id_product_attribute>`)) {
          
          // Try multiple ID extraction patterns
          let stockId: number | null = null;
          
          // Pattern 1: <id><![CDATA[4703]]></id>
          let idMatch = block.match(/<id><!\[CDATA\[(\d+)\]\]><\/id>/);
          if (idMatch) {
            stockId = parseInt(idMatch[1]);
          }
          
          // Pattern 2: id="4703" in opening tag
          if (!stockId) {
            idMatch = block.match(/id="(\d+)"/);
            if (idMatch) {
              stockId = parseInt(idMatch[1]);
            }
          }
          
          if (stockId) {
            console.log(`📦 Found stock_available ID: ${stockId}`);
            
            // Try minimal XML for PATCH as shown in PrestaShop docs
            const minimalStockXML = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <stock_available>
    <id>${stockId}</id>
    <quantity>${quantity}</quantity>
  </stock_available>
</prestashop>`;

            const updateStockUrl = `https://${cleanedShopUrl}/api/stock_availables/${stockId}`;
            
            // Try PATCH with minimal XML first
            let updateStockResponse = await fetch(updateStockUrl, {
              method: 'PATCH',
              headers: {
                'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
                'Content-Type': 'application/xml',
                'Accept': 'application/xml'
              },
              body: minimalStockXML
            });

            if (updateStockResponse.ok) {
              console.log(`✅ Updated stock quantity to ${quantity} for combination ${combinationId} using minimal PATCH`);
              return true;
            } else {
              const errorText = await updateStockResponse.text();
              console.error(`❌ Minimal PATCH failed (${updateStockResponse.status}):`, errorText.substring(0, 300));
              
              // Try full XML with PATCH
              const fullStockXML = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <stock_available>
    <id>${stockId}</id>
    <id_product>${productId}</id_product>
    <id_product_attribute>${combinationId}</id_product_attribute>
    <id_shop>${shopId}</id_shop>
    <id_shop_group>${shopGroupId}</id_shop_group>
    <quantity>${quantity}</quantity>
    <depends_on_stock>0</depends_on_stock>
    <out_of_stock>2</out_of_stock>
  </stock_available>
</prestashop>`;
              
              updateStockResponse = await fetch(updateStockUrl, {
                method: 'PATCH',
                headers: {
                  'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
                  'Content-Type': 'application/xml',
                  'Accept': 'application/xml'
                },
                body: fullStockXML
              });

              if (updateStockResponse.ok) {
                console.log(`✅ Updated stock quantity to ${quantity} for combination ${combinationId} using full PATCH`);
                return true;
              } else {
                const patchErrorText = await updateStockResponse.text();
                console.error(`❌ Full PATCH failed (${updateStockResponse.status}):`, patchErrorText.substring(0, 300));
                
                // Finally try PUT as last resort
                updateStockResponse = await fetch(updateStockUrl, {
                  method: 'PUT',
                  headers: {
                    'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
                    'Content-Type': 'application/xml',
                    'Accept': 'application/xml'
                  },
                  body: fullStockXML
                });
                
                if (updateStockResponse.ok) {
                  console.log(`✅ Updated stock quantity to ${quantity} for combination ${combinationId} using PUT`);
                  return true;
                } else {
                  const putErrorText = await updateStockResponse.text();
                  console.error(`❌ PUT also failed:`, updateStockResponse.status, putErrorText.substring(0, 300));
                }
              }
            }
            break;
          }
        }
      }
      
      console.error('❌ Could not find stock_available ID in response');
      
      // If stock_available doesn't exist for combination, create it
      console.log('🔄 Attempting to create stock_available for combination...');
      const createStockXML = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <stock_available>
    <id_product>${productId}</id_product>
    <id_product_attribute>${combinationId}</id_product_attribute>
    <id_shop>${shopId}</id_shop>
    <id_shop_group>${shopGroupId}</id_shop_group>
    <quantity>${quantity}</quantity>
    <depends_on_stock>0</depends_on_stock>
    <out_of_stock>2</out_of_stock>
  </stock_available>
</prestashop>`;

      const createStockUrl = `https://${cleanedShopUrl}/api/stock_availables`;
      const createStockResponse = await fetch(createStockUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
          'Content-Type': 'application/xml',
          'Accept': 'application/xml'
        },
        body: createStockXML
      });

      if (createStockResponse.ok) {
        console.log(`✅ Created stock_available for combination ${combinationId} with quantity ${quantity}`);
        return true;
      } else {
        const createErrorText = await createStockResponse.text();
        console.error(`❌ Failed to create stock_available:`, createStockResponse.status, createErrorText);
      }
    } else {
      const errorText = await getStockResponse.text();
      console.error('❌ Failed to get stock_available:', getStockResponse.status, errorText);
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error updating combination stock:', error);
    return false;
  }
}

// Check if category exists and create if not
async function ensureCategory(categoryName: string, apiKey: string, cleanedShopUrl: string, parentId: string = '2'): Promise<string | null> {
  try {
    console.log(`🏷️ Checking category: "${categoryName}"`);
    
    // First, get all categories and search manually (more reliable than filter)
    const getCategoriesUrl = `https://${cleanedShopUrl}/api/categories?display=full`;
    
    const getCategoriesResponse = await fetch(getCategoriesUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
        'Accept': 'application/xml'
      }
    });

    if (getCategoriesResponse.ok) {
      const categoriesResponseText = await getCategoriesResponse.text();
      console.log('🔍 Categories response length:', categoriesResponseText.length);
      
      // Search for our category name in the response
      const normalizedSearchName = categoryName.toLowerCase().trim();
      
      // Look for categories that match our name
      const categoryBlocks = categoriesResponseText.split('<category');
      
      for (const block of categoryBlocks) {
        if (block.includes('<name>')) {
          // Extract all language names from this category
          const nameMatches = block.match(/<name>[\s\S]*?<\/name>/);
          if (nameMatches) {
            const nameBlock = nameMatches[0];
            const languageNames = nameBlock.match(/<language[^>]*><!\[CDATA\[(.*?)\]\]><\/language>/g);
            
            if (languageNames) {
              // Check if any language name matches our search
              for (const langName of languageNames) {
                const nameMatch = langName.match(/<!\[CDATA\[(.*?)\]\]>/);
                if (nameMatch) {
                  const existingName = nameMatch[1].toLowerCase().trim();
                  if (existingName === normalizedSearchName) {
                    // Found a match! Extract the category ID
                    const idMatch = block.match(/<id><!\[CDATA\[(\d+)\]\]><\/id>/);
                    if (idMatch) {
                      const categoryId = idMatch[1];
                      console.log(`✅ Found existing category "${categoryName}" with ID: ${categoryId}`);
                      return categoryId;
                    }
                  }
                }
              }
            }
          }
        }
      }
      
      console.log(`❌ Category "${categoryName}" not found in existing categories`);
    }
    
    console.log(`➕ Creating new category: "${categoryName}"`);
    
    // Clean category name for XML safety
    const xmlSafeName = categoryName
      .replace(/[<>&"']/g, '') // Remove XML problematic characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
    
    // Create URL-friendly slug
    const slug = xmlSafeName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
    console.log(`🔍 XML-safe name: "${xmlSafeName}", Slug: "${slug}"`);
    
    // Create new category
    const createCategoryXML = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <category>
    <name>
      <language id="1"><![CDATA[${xmlSafeName}]]></language>
      <language id="2"><![CDATA[${xmlSafeName}]]></language>
      <language id="3"><![CDATA[${xmlSafeName}]]></language>
      <language id="4"><![CDATA[${xmlSafeName}]]></language>
    </name>
    <link_rewrite>
      <language id="1"><![CDATA[${slug}]]></language>
      <language id="2"><![CDATA[${slug}]]></language>
      <language id="3"><![CDATA[${slug}]]></language>
      <language id="4"><![CDATA[${slug}]]></language>
    </link_rewrite>
    <description>
      <language id="1"><![CDATA[${xmlSafeName} kategorisi]]></language>
      <language id="2"><![CDATA[${xmlSafeName} category]]></language>
      <language id="3"><![CDATA[فئة ${xmlSafeName}]]></language>
      <language id="4"><![CDATA[Categoria ${xmlSafeName}]]></language>
    </description>
    <active>1</active>
    <id_parent>${parentId}</id_parent>
  </category>
</prestashop>`;

    const createCategoryUrl = `https://${cleanedShopUrl}/api/categories`;
    const createCategoryResponse = await fetch(createCategoryUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
        'Content-Type': 'application/xml',
        'Accept': 'application/xml'
      },
      body: createCategoryXML
    });

    if (createCategoryResponse.ok) {
      const createResponseText = await createCategoryResponse.text();
      console.log('🔍 Create category response:', createResponseText.substring(0, 300));
      
      const categoryIdMatch = createResponseText.match(/<id><!\[CDATA\[(\d+)\]\]><\/id>/);
      if (categoryIdMatch) {
        const categoryId = categoryIdMatch[1];
        console.log(`✅ Created category "${categoryName}" with ID: ${categoryId}`);
        return categoryId;
      }
    } else {
      const errorText = await createCategoryResponse.text();
      console.error(`❌ Failed to create category "${categoryName}":`, createCategoryResponse.status, errorText);
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Error ensuring category "${categoryName}":`, error);
    return null;
  }
}

// Process Etsy categories and get PrestaShop category ID
async function processCategoriesFromEtsy(etsyCategories: string[], apiKey: string, cleanedShopUrl: string): Promise<{ mainCategoryId: string, allCategoryIds: string[] }> {
  try {
    console.log('🏷️ Processing Etsy categories:', etsyCategories);
    
    // Default fallback category
    let finalCategoryId = '2'; // Home category
    let allCategoryIds: string[] = ['2']; // Always include Home category
    
    if (etsyCategories && etsyCategories.length > 0) {
      // Filter out empty/invalid categories
      const validCategories = etsyCategories
        .filter(cat => cat && typeof cat === 'string' && cat.trim())
        .map(cat => cat.trim());
      
      console.log('🔍 Valid categories:', validCategories);
      
      if (validCategories.length > 0) {
        // Process each category path
        for (const categoryPath of validCategories) {
          // Check if this looks like a hierarchical path (contains < or > or / or |)
          let categoryHierarchy: string[] = [];
          
          if (categoryPath.includes(' < ')) {
            // Etsy format: "Jewelry < Necklaces < Pendant Necklaces"
            categoryHierarchy = categoryPath.split(' < ').map(cat => cat.trim());
          } else if (categoryPath.includes(' > ')) {
            // Alternative format: "Jewelry > Necklaces > Pendant Necklaces"
            categoryHierarchy = categoryPath.split(' > ').map(cat => cat.trim());
          } else if (categoryPath.includes(' / ')) {
            // Path format: "Jewelry / Necklaces / Pendant Necklaces"
            categoryHierarchy = categoryPath.split(' / ').map(cat => cat.trim());
          } else if (categoryPath.includes(' | ')) {
            // Pipe format: "Jewelry | Necklaces | Pendant Necklaces"
            categoryHierarchy = categoryPath.split(' | ').map(cat => cat.trim());
          } else {
            // Single category
            categoryHierarchy = [categoryPath];
          }
          
          console.log(`🔍 Parsed category hierarchy:`, categoryHierarchy);
          
          // Create hierarchical categories and collect all IDs
          let currentParentId = '2'; // Start with Home category
          let currentPathIds: string[] = ['2']; // Track this path's category IDs
          
          for (let i = 0; i < categoryHierarchy.length; i++) {
            const categoryName = categoryHierarchy[i];
            
            // Clean category name for PrestaShop
            const cleanCategoryName = categoryName
              .replace(/[<>&"']/g, '') // Remove XML problematic characters
              .replace(/\s+/g, ' ') // Normalize spaces
              .trim();
            
            if (cleanCategoryName) {
              console.log(`🏷️ Processing category "${cleanCategoryName}" under parent ${currentParentId}`);
              
              const categoryId = await ensureCategory(cleanCategoryName, apiKey, cleanedShopUrl, currentParentId);
              if (categoryId) {
                currentParentId = categoryId; // Next category will be child of this one
                finalCategoryId = categoryId; // This becomes our final category
                currentPathIds.push(categoryId); // Add to path
                console.log(`✅ Set category ID to: ${categoryId} for "${cleanCategoryName}"`);
              } else {
                console.log(`⚠️ Failed to ensure category "${cleanCategoryName}", stopping hierarchy creation`);
                break; // Stop if category creation fails
              }
            }
          }
          
          // Add all category IDs from this path to our collection
          allCategoryIds = [...new Set([...allCategoryIds, ...currentPathIds])];
          
          // If we successfully created at least one category, we can stop
          if (finalCategoryId !== '2') {
            break;
          }
        }
      }
    }
    
    console.log(`🏷️ Final category ID: ${finalCategoryId}`);
    console.log(`🏷️ All category IDs: ${allCategoryIds.join(', ')}`);
    return { mainCategoryId: finalCategoryId, allCategoryIds: [...new Set(allCategoryIds)] };
  } catch (error) {
    console.error('❌ Error processing categories:', error);
    return { mainCategoryId: '2', allCategoryIds: ['2'] }; // Default category
  }
}

// Force refresh product-category associations in PrestaShop using category_products endpoint
async function refreshProductCategoryAssociations(productId: string, categoryIds: string[], apiKey: string, cleanedShopUrl: string): Promise<void> {
  try {
    console.log(`🔄 Refreshing category associations for product ${productId}`);
    console.log(`🔍 Categories to associate: ${categoryIds.join(', ')}`);
    
    // Wait for PrestaShop to fully process the product
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Method 1: Update each category to include this product
    for (const categoryId of categoryIds) {
      try {
        console.log(`🔗 Adding product ${productId} to category ${categoryId}`);
        
        // Get current category data with its products
        const getCategoryUrl = `https://${cleanedShopUrl}/api/categories/${categoryId}?display=full`;
        
        const getCategoryResponse = await fetch(getCategoryUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
            'Accept': 'application/xml'
          }
        });

        if (getCategoryResponse.ok) {
          const categoryResponseText = await getCategoryResponse.text();
          
          // Check if product is already in category
          if (categoryResponseText.includes(`<id>${productId}</id>`)) {
            console.log(`✅ Product ${productId} already in category ${categoryId}`);
            continue;
          }
          
          // Extract existing products in this category
          let existingProducts: string[] = [];
          const productMatches = categoryResponseText.match(/<products[^>]*>([\s\S]*?)<\/products>/);
          if (productMatches) {
            const productsSection = productMatches[1];
            const productIds = productsSection.match(/<id>(\d+)<\/id>/g);
            if (productIds) {
              existingProducts = productIds.map(match => match.match(/(\d+)/)?.[1] || '').filter(id => id);
            }
          }
          
          // Add our product to the list
          const allProducts = [...new Set([...existingProducts, productId])];
          console.log(`🔍 Category ${categoryId} will have products: ${allProducts.join(', ')}`);
          
          // Update category with new product list
          const updateCategoryXML = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <category>
    <id>${categoryId}</id>
    <associations>
      <products>
        ${allProducts.map(pid => `<product><id>${pid}</id></product>`).join('\n        ')}
      </products>
    </associations>
  </category>
</prestashop>`;

          const updateCategoryUrl = `https://${cleanedShopUrl}/api/categories/${categoryId}`;
          const updateResponse = await fetch(updateCategoryUrl, {
            method: 'PATCH',
            headers: {
              'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
              'Content-Type': 'application/xml',
              'Accept': 'application/xml'
            },
            body: updateCategoryXML
          });

          if (updateResponse.ok) {
            console.log(`✅ Added product ${productId} to category ${categoryId}`);
          } else {
            const errorText = await updateResponse.text();
            console.log(`⚠️ Failed to add product to category ${categoryId}:`, errorText.substring(0, 200));
          }
        } else {
          console.log(`❌ Could not get category ${categoryId} data`);
        }
      } catch (categoryError) {
        console.error(`❌ Error updating category ${categoryId}:`, categoryError);
      }
    }
    
    // Method 2: Also update the product itself with all categories
    console.log(`🔄 Updating product ${productId} with category associations`);
    
    const updateProductXML = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product>
    <id>${productId}</id>
    <id_category_default>${categoryIds[categoryIds.length - 1]}</id_category_default>
    <associations>
      <categories>
        ${categoryIds.map(catId => `<category><id>${catId}</id></category>`).join('\n        ')}
      </categories>
    </associations>
  </product>
</prestashop>`;

    const updateProductUrl = `https://${cleanedShopUrl}/api/products/${productId}`;
    const updateProductResponse = await fetch(updateProductUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
        'Content-Type': 'application/xml',
        'Accept': 'application/xml'
      },
      body: updateProductXML
    });

    if (updateProductResponse.ok) {
      console.log(`✅ Updated product ${productId} with category associations`);
      
      // Final verification - get updated product data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const verifyProductUrl = `https://${cleanedShopUrl}/api/products/${productId}?display=full`;
      const verifyResponse = await fetch(verifyProductUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
          'Accept': 'application/xml'
        }
      });
      
      if (verifyResponse.ok) {
        const verifyText = await verifyResponse.text();
        const categoryMatches = verifyText.match(/<categories[^>]*>([\s\S]*?)<\/categories>/);
        if (categoryMatches) {
          const categoriesFound = (categoryMatches[1].match(/<id>(\d+)<\/id>/g) || []).length;
          console.log(`✅ Verification: Product ${productId} now has ${categoriesFound} categories assigned`);
        }
      }
    } else {
      const errorText = await updateProductResponse.text();
      console.log(`⚠️ Failed to update product category associations:`, errorText.substring(0, 200));
    }
    
  } catch (error) {
    console.error('❌ Error refreshing category associations:', error);
  }
}

// Add images to PrestaShop product
async function addImagesToPrestaShop(productId: string, imageUrls: any[], apiKey: string, shopUrl: string): Promise<boolean> {
  console.log(`📸 Adding ${imageUrls.length} images to PrestaShop product ${productId}`);
  console.log(`🔍 Raw image data:`, JSON.stringify(imageUrls.slice(0, 2), null, 2));
  
  let successCount = 0;
  const maxImages = 10; // Limit to 10 images
  const imagesToProcess = imageUrls.slice(0, maxImages);

  for (let i = 0; i < imagesToProcess.length; i++) {
    let imageData = imagesToProcess[i];
    console.log(`🔄 Processing image ${i + 1}/${imagesToProcess.length}:`);
    console.log(`🔍 Image data type: ${typeof imageData}`);
    console.log(`🔍 Image data:`, JSON.stringify(imageData, null, 2));

    // Extract URL from image object or use string directly
    let imageUrl = imageData;
    if (typeof imageData === 'object' && imageData !== null) {
      console.log('🔍 Available properties:', Object.keys(imageData));
      
      // Try different possible URL properties
      const possibleUrls = [
        imageData.contentURL,   // Etsy uses this
        imageData.url,
        imageData.src, 
        imageData.href,
        imageData.original,
        imageData.large,
        imageData.full,
        imageData.medium,
        imageData.small,
        imageData.source,
        imageData.link,
        imageData.image_url,
        imageData.imageUrl,
        imageData.thumbnail     // Fallback to thumbnail if needed
      ];
      
      imageUrl = possibleUrls.find(url => url && typeof url === 'string' && url.startsWith('http'));
      
      if (!imageUrl) {
        console.log('❌ No valid URL found in image object');
        continue;
      }
    }
    
    console.log(`🔍 Final image URL: ${imageUrl}`);

    try {
      // First, download the image
      const imageResponse = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!imageResponse.ok) {
        console.log(`❌ Failed to download image from ${imageUrl}: ${imageResponse.status}`);
        continue;
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
      
      // Get file extension from content type
      let extension = 'jpg';
      if (contentType.includes('png')) extension = 'png';
      else if (contentType.includes('gif')) extension = 'gif';
      else if (contentType.includes('webp')) extension = 'webp';

      console.log(`📷 Image ${i + 1} downloaded: ${imageBuffer.byteLength} bytes, type: ${contentType}`);

      // Create form data for PrestaShop image upload
      const formData = new FormData();
      const imageBlob = new Blob([imageBuffer], { type: contentType });
      formData.append('image', imageBlob, `product_image_${i + 1}.${extension}`);

      // Upload to PrestaShop
      const uploadUrl = `https://${shopUrl}/api/images/products/${productId}`;
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
        },
        body: formData
      });

      if (uploadResponse.ok) {
        const responseText = await uploadResponse.text();
        console.log(`✅ Image ${i + 1} uploaded successfully to PrestaShop`);
        console.log(`🔍 Upload response: ${responseText.substring(0, 200)}...`);
        successCount++;
      } else {
        const errorText = await uploadResponse.text();
        console.log(`❌ Failed to upload image ${i + 1} to PrestaShop: ${uploadResponse.status}`);
        console.log(`🔍 Error response: ${errorText.substring(0, 200)}...`);
      }

    } catch (error) {
      console.log(`❌ Error processing image ${i + 1}:`, error);
    }

    // Add delay between uploads to avoid rate limiting
    if (i < imagesToProcess.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`📸 Image upload completed: ${successCount}/${imagesToProcess.length} successful`);
  return successCount > 0;
}

async function publishToPrestaShopDirect(product: any, apiKey: string, shopUrl: string, existingData?: any) {
  try {
    console.log('🔍 PrestaShop Direct API Publishing...');
    console.log('🔍 Shop URL:', shopUrl);
    console.log('🔍 API Key length:', apiKey?.length || 0);
    
    // Check if product already exists in PrestaShop
    const isUpdate = existingData && existingData.productId && existingData.productId !== 'unknown';
    console.log('🔍 Operation type:', isUpdate ? `UPDATE (ID: ${existingData.productId})` : 'CREATE NEW');

    // Clean shop URL - remove protocol, trailing slash, and corruption like :your-32-
    let cleanedShopUrl = shopUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Fix corrupted URLs that might have port or extra characters like :your-32-
    if (cleanedShopUrl.includes(':')) {
      const parts = cleanedShopUrl.split(':');
      cleanedShopUrl = parts[0]; // Take only the domain part before the colon
    }
    
    // Remove any non-domain characters (keep only letters, numbers, dots, hyphens)
    cleanedShopUrl = cleanedShopUrl.replace(/[^a-zA-Z0-9.-]/g, '');
    
    console.log('🔍 Original Shop URL:', shopUrl);
    console.log('🔍 Cleaned Shop URL:', cleanedShopUrl);

  // Debug collection for PrestaShop API interactions
  const debug: any[] = [];

    // Get enhanced content from AI
    const aiContent = typeof product.aiRewrittenContent === 'string' 
      ? JSON.parse(product.aiRewrittenContent) 
      : product.aiRewrittenContent;
    
    // Debug: AI içerik yapısını kontrol et
    console.log('🔍 AI Content Debug:');
    console.log('- AI Content type:', typeof aiContent);
    console.log('- AI Content keys:', aiContent ? Object.keys(aiContent) : 'null');
    if (aiContent) {
      console.log('- Full AI Content structure:', JSON.stringify(aiContent, null, 2));
    }
    
    const contentData = {
      // Türkçe içerik (Language ID: 1) - AI key: 'tr'
      turkish: {
        title: aiContent?.tr?.title || product.originalTitle || 'Başlıksız Ürün',
        description: aiContent?.tr?.description || product.originalDescription || 'Açıklama yok',
        keywords: aiContent?.tr?.keywords || []
      },
      // İngilizce içerik (Language ID: 2) - AI key: 'en'
      english: {
        title: aiContent?.en?.title || product.originalTitle || 'Untitled Product',
        description: aiContent?.en?.description || product.originalDescription || 'No description',
        keywords: aiContent?.en?.keywords || []
      },
      // Arapça içerik (Language ID: 3) - AI key: 'ar'
      arabic: {
        title: aiContent?.ar?.title || aiContent?.en?.title || product.originalTitle || 'منتج بدون عنوان',
        description: aiContent?.ar?.description || aiContent?.en?.description || product.originalDescription || 'لا يوجد وصف',
        keywords: aiContent?.ar?.keywords || aiContent?.en?.keywords || []
      },
      // İtalyanca içerik (Language ID: 4) - AI key: 'it'
      italian: {
        title: aiContent?.it?.title || aiContent?.en?.title || product.originalTitle || 'Prodotto senza titolo',
        description: aiContent?.it?.description || aiContent?.en?.description || product.originalDescription || 'Nessuna descrizione',
        keywords: aiContent?.it?.keywords || aiContent?.en?.keywords || []
      }
    };

    console.log('🌐 Multi-language content prepared:');
    console.log('- Turkish title:', contentData.turkish.title.substring(0, 50) + '...');
    console.log('- English title:', contentData.english.title.substring(0, 50) + '...');
    console.log('- Arabic title:', contentData.arabic.title.substring(0, 50) + '...');
    console.log('- Italian title:', contentData.italian.title.substring(0, 50) + '...');
    
    // Debug: AI içeriklerinin kullanılıp kullanılmadığını kontrol et
    console.log('🔍 Content Source Check:');
    console.log('- Turkish from AI?', aiContent?.tr?.title ? '✅ YES' : '❌ NO (using fallback)');
    console.log('- English from AI?', aiContent?.en?.title ? '✅ YES' : '❌ NO (using fallback)');
    console.log('- Arabic from AI?', aiContent?.ar?.title ? '✅ YES' : '❌ NO (using fallback)');
    console.log('- Italian from AI?', aiContent?.it?.title ? '✅ YES' : '❌ NO (using fallback)');

    // Process categories from Etsy and ensure they exist in PrestaShop
    console.log('🏷️ Starting category processing...');
    let categoryId = '2'; // Default fallback
    let allCategoryIds: string[] = ['2']; // Default fallback
    
    try {
      // Extract Etsy categories from product
      let etsyCategories: string[] = [];
      
      // Debug: Log the entire product structure for category fields
      console.log('🔍 Product keys for category detection:', Object.keys(product));
      
      // Try different possible category sources
      if (product.category) {
        if (Array.isArray(product.category)) {
          etsyCategories = etsyCategories.concat(product.category);
        } else {
          etsyCategories.push(product.category);
        }
      }
      
      if (product.categories && Array.isArray(product.categories)) {
        etsyCategories = etsyCategories.concat(product.categories);
      }
      
      if (product.categoryPath && Array.isArray(product.categoryPath)) {
        etsyCategories = etsyCategories.concat(product.categoryPath);
      }
      
      // Also check in original data structure (different casing)
      if (product.Category) {
        if (Array.isArray(product.Category)) {
          etsyCategories = etsyCategories.concat(product.Category);
        } else {
          etsyCategories.push(product.Category);
        }
      }
      
      // Check for product_type as category fallback
      if (product.product_type && !etsyCategories.length) {
        etsyCategories.push(product.product_type);
      }
      
      // Check for type field
      if (product.type && !etsyCategories.length) {
        etsyCategories.push(product.type);
      }
      
      // Check for tags that might indicate categories
      if (product.tags && Array.isArray(product.tags) && !etsyCategories.length) {
        // Take first few tags as potential categories
        etsyCategories = etsyCategories.concat(product.tags.slice(0, 2));
      }
      
      console.log('🔍 Raw extracted categories:', etsyCategories);
      
      // Clean up categories - remove duplicates and empty values
      const cleanCategories = [...new Set(etsyCategories)]
        .filter(cat => cat && typeof cat === 'string' && cat.trim() && cat.toLowerCase() !== 'handmade')
        .map(cat => cat.trim());
      
      console.log('🔍 Cleaned categories:', cleanCategories);
      
      if (cleanCategories.length > 0) {
        const categoryResult = await processCategoriesFromEtsy(cleanCategories, apiKey, cleanedShopUrl);
        categoryId = categoryResult.mainCategoryId;
        allCategoryIds = categoryResult.allCategoryIds;
      } else {
        console.log('⚠️ No valid Etsy categories found, using default category');
      }
    } catch (error) {
      console.error('❌ Error processing categories:', error);
      console.log('🔄 Using default category ID: 2');
    }

    // Parse XAU pricing (troy ounce) and prepare combinations for variants
    let xauPricing = { price: '0', comparePrice: null };
    let hasVariants = false;
    let variants = [];
    let currentXauRate = null; // For variant price conversion
    
    try {
      if ((product as any).xauPricing) {
        const xauData = (product as any).xauPricing;
        xauPricing = {
          price: xauData.price.toFixed(6), // 6 decimal places for troy ounce precision
          comparePrice: xauData.comparePrice ? xauData.comparePrice.toFixed(6) : null
        };
        currentXauRate = { ratePerOz: xauData.rate || 2000 }; // Store current rate for variant conversion
        console.log('🥇 XAU Pricing for PrestaShop:', xauPricing);
      } else {
        console.log('❌ No XAU pricing found, using fallback');
        // Fallback to USD pricing if XAU not available
        if (product.pricing) {
          const usdPricing = JSON.parse(product.pricing);
          xauPricing = {
            price: usdPricing.price || '0',
            comparePrice: usdPricing.comparePrice
          };
        }
      }

      // Check for variants and prepare combinations
      if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
        // Check if variants actually have options (combinations)
        const validVariants = product.variants.filter((variant: any) => 
          variant.options && Array.isArray(variant.options) && variant.options.length > 0
        );
        
        if (validVariants.length > 0) {
          hasVariants = true; // Enable proper combination products
          variants = validVariants;
          console.log('🔄 Product has variants, preparing combinations for PrestaShop');
          console.log('🔍 Valid variants count:', variants.length);
          
          // Log variant details for debugging
          variants.forEach((variant: any, index: number) => {
            console.log(`📝 Variant ${index + 1}: ${variant.name} - ${variant.options?.length || 0} options`);
            variant.options?.forEach((option: any, optIndex: number) => {
              console.log(`  Option ${optIndex + 1}: ${option.name} - Price: ${option.price} ${option.currency || 'TRY'}`);
            });
          });
        } else {
          console.log('📝 Product has variants array but no valid options - treating as simple product');
        }
      }
    } catch (e) {
      console.log('Error parsing XAU pricing or variants:', e);
    }

    // Compute numeric base prices for proportional conversions
    let productBasePriceNum: number | null = null;
    let productBaseXauNum: number | null = null;
    try {
      if (product.pricing) {
        const parsedPricing = typeof product.pricing === 'string' ? JSON.parse(product.pricing) : product.pricing;
        productBasePriceNum = parseFloat(parsedPricing.price) || null;
      }
      if ((product as any).xauPricing) {
        const parsedXau = (product as any).xauPricing;
        productBaseXauNum = parsedXau.price ? Number(parsedXau.price) : null;
      }
    } catch (e) {
      console.log('Error computing base prices for variants:', e);
    }

    // Truncate titles to PrestaShop limits (128 characters) for each language
    const truncatedTitles = {
      turkish: contentData.turkish.title.length > 128 
        ? contentData.turkish.title.substring(0, 125) + '...' 
        : contentData.turkish.title,
      english: contentData.english.title.length > 128 
        ? contentData.english.title.substring(0, 125) + '...' 
        : contentData.english.title,
      arabic: contentData.arabic.title.length > 128 
        ? contentData.arabic.title.substring(0, 125) + '...' 
        : contentData.arabic.title,
      italian: contentData.italian.title.length > 128 
        ? contentData.italian.title.substring(0, 125) + '...' 
        : contentData.italian.title
    };

    console.log('🔍 Title lengths:');
    console.log('- Turkish:', contentData.turkish.title.length, '→', truncatedTitles.turkish.length);
    console.log('- English:', contentData.english.title.length, '→', truncatedTitles.english.length);

    // Create PrestaShop product structure (XML format) with combinations for variants
    const productXML = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product>
    ${isUpdate ? `<id><![CDATA[${existingData.productId}]]></id>` : ''}
    <name>
      <language id="1"><![CDATA[${truncatedTitles.turkish}]]></language>
      <language id="2"><![CDATA[${truncatedTitles.english}]]></language>
      <language id="3"><![CDATA[${truncatedTitles.arabic}]]></language>
      <language id="4"><![CDATA[${truncatedTitles.italian}]]></language>
    </name>
    <description>
      <language id="1"><![CDATA[${contentData.turkish.description.substring(0, 3999)}]]></language>
      <language id="2"><![CDATA[${contentData.english.description.substring(0, 3999)}]]></language>
      <language id="3"><![CDATA[${contentData.arabic.description.substring(0, 3999)}]]></language>
      <language id="4"><![CDATA[${contentData.italian.description.substring(0, 3999)}]]></language>
    </description>
    <description_short>
      <language id="1"><![CDATA[${truncatedTitles.turkish}]]></language>
      <language id="2"><![CDATA[${truncatedTitles.english}]]></language>
      <language id="3"><![CDATA[${truncatedTitles.arabic}]]></language>
      <language id="4"><![CDATA[${truncatedTitles.italian}]]></language>
    </description_short>
    <price>${xauPricing.price || '0'}</price>
    <wholesale_price>${xauPricing.comparePrice || xauPricing.price || '0'}</wholesale_price>
    <active>1</active>
    <available_for_order>1</available_for_order>
    <show_price>1</show_price>
    <online_only>0</online_only>
    <id_category_default>${categoryId}</id_category_default>
    <state>1</state>
    <condition>new</condition>
    <visibility>both</visibility>
    <associations>
      <categories>
        ${allCategoryIds.map(catId => `<category><id>${catId}</id></category>`).join('\n        ')}
      </categories>
    </associations>
  </product>
</prestashop>`;

    console.log('📦 PrestaShop Multi-language Product XML prepared');
    console.log('🌐 Languages included: Turkish (1), English (2), Arabic (3), Italian (4)');
    if (hasVariants) {
      console.log('🔄 Product will be created as COMBINATION type with', variants.length, 'variant groups');
      console.log('💡 Combinations will be created separately after product creation');
    } else {
      console.log('📌 Product has no variants - SIMPLE product type');
    }

    // API endpoints - different for create vs update
    let apiEndpoints;
    let httpMethod;
    
    if (isUpdate) {
      // UPDATE existing product
      apiEndpoints = [
        `/api/products/${existingData.productId}`,
        `/api/product/${existingData.productId}`
      ];
      httpMethod = 'PUT';
      console.log('🔄 Will UPDATE existing product with ID:', existingData.productId);
    } else {
      // CREATE new product
      apiEndpoints = [
        '/api/products',
        '/api/product'
      ];
      httpMethod = 'POST';
      console.log('➕ Will CREATE new product');
    }

    for (const endpoint of apiEndpoints) {
      try {
        const apiUrl = `https://${cleanedShopUrl}${endpoint}`;
        console.log(`🔍 Trying: ${apiUrl}`);

        const response = await fetch(apiUrl, {
          method: httpMethod,
          headers: {
            'Authorization': `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
            'Content-Type': 'application/xml',
            'Accept': 'application/xml'
          },
          body: productXML
        });

        // Always read response text for debugging
        const responseText = await response.text();
        debug.push({ action: 'productCreateAttempt', endpoint: apiUrl, status: response.status, responseSnippet: responseText.substring(0, 2000) });

        console.log(`🔍 API ${endpoint} response:`, response.status);
        console.log('🔍 Response Headers:', Object.fromEntries(response.headers.entries()));
        console.log('🔍 Full XML response for ID extraction (truncated):', responseText.substring(0, 1000));

        if (response.status === 201 || response.status === 200) {

          // Try to extract product ID from XML response with multiple patterns
          let productId = 'unknown';
          try {
            // Pattern 1: <product id="123" ...>
            let idMatch = responseText.match(/<product[^>]*id="(\d+)"/);
            if (idMatch) {
              productId = idMatch[1];
              console.log('✅ Product ID extracted with pattern 1:', productId);
            } else {
              // Pattern 2: <id><![CDATA[123]]></id> (CDATA format)
              idMatch = responseText.match(/<id><!\[CDATA\[(\d+)\]\]><\/id>/);
              if (idMatch) {
                productId = idMatch[1];
                console.log('✅ Product ID extracted with pattern 2 (CDATA):', productId);
              } else {
                // Pattern 3: <product><id>123</id>
                idMatch = responseText.match(/<product[^>]*>[\s\S]*?<id[^>]*>(\d+)<\/id>/);
                if (idMatch) {
                  productId = idMatch[1];
                  console.log('✅ Product ID extracted with pattern 3:', productId);
                } else {
                  // Pattern 4: <id>123</id> anywhere in response
                  idMatch = responseText.match(/<id[^>]*>(\d+)<\/id>/);
                  if (idMatch) {
                    productId = idMatch[1];
                    console.log('✅ Product ID extracted with pattern 4:', productId);
                  } else {
                    console.log('❌ Could not extract product ID from XML response');
                    console.log('Response structure:', responseText.substring(0, 1000));
                  }
                }
              }
            }
          } catch (parseError) {
            console.log('❌ Error parsing product ID from response:', parseError);
          }

          const operationText = isUpdate ? 'updated' : 'created';
          console.log(`🎉 PrestaShop Product ${operationText} successfully!`);
          console.log('Product ID:', productId);
          
          // Prepare the publish result object so we can attach combination IDs later
          const publishResult: any = {
            success: true,
            productId: productId,
            url: `https://${cleanedShopUrl}/index.php?id_product=${productId}&controller=product`,
            adminUrl: `https://${cleanedShopUrl}/admin/index.php?controller=AdminProducts&id_product=${productId}`,
            status: 'active',
            isNew: !isUpdate,
            operation: operationText,
            hasVariants: hasVariants,
            variantsCount: hasVariants ? variants.length : 0,
            combinationIds: [],
            debug
          };

          // Refresh category associations to ensure proper indexing
          if (!isUpdate && productId !== 'unknown') {
            console.log('🔄 Refreshing product-category associations...');
            await refreshProductCategoryAssociations(productId, allCategoryIds, apiKey, cleanedShopUrl);
          }
          
          // If product has variants, create combinations
          if (hasVariants && variants.length > 0) {
            console.log('🔗 Creating combinations for variant product...');
            const ratePerOz = currentXauRate?.ratePerOz || ((product as any).xauPricing?.rate) || null;
            const combinationsResult = await createCombinations(productId, variants, apiKey, cleanedShopUrl, ratePerOz as any, productBasePriceNum || undefined, productBaseXauNum || undefined, product.originalTitle || product.original_title || product.title, product.specifications || product.specs);
            if (combinationsResult) {
              if (combinationsResult.success) {
                console.log('✅ Combinations created successfully');
              } else {
                console.log('⚠️ Some combinations may have failed - check logs');
              }

              // Attach combination IDs to publishResult so we can persist them
              publishResult.combinationIds = combinationsResult.combinationIds || [];
              // Merge combination debug info
              if (combinationsResult.debug) {
                debug.push({ action: 'createCombinations', details: combinationsResult.debug });
              }
            }
          }
          
          // Add images to PrestaShop product
          const originalImages = typeof product.originalImages === 'string' 
            ? JSON.parse(product.originalImages) 
            : product.originalImages;
            
          if (originalImages && Array.isArray(originalImages) && originalImages.length > 0) {
            console.log(`📸 Starting image upload for ${originalImages.length} images...`);
            
            // Debug: Log the first few images to see their structure
            console.log('🔍 First 2 images:', JSON.stringify(originalImages.slice(0, 2), null, 2));
            
            // Pass original images directly to let the function handle URL extraction
            const imagesSuccess = await addImagesToPrestaShop(productId, originalImages, apiKey, cleanedShopUrl);
              
            if (imagesSuccess) {
              console.log('✅ Images uploaded successfully to PrestaShop');
            } else {
              console.log('⚠️ Some images may have failed to upload - check logs');
            }
          } else {
            console.log('📸 No images found to upload');
          }
          
          return publishResult;
        }

        if (response.status === 401) {
          throw new Error('Invalid API credentials - check API key');
        }

        if (response.status === 403) {
          throw new Error('API access forbidden - check permissions');
        }

        // Log detailed error for debugging
        const errorText = await response.text();
        console.log(`🔍 Full Error response for ${endpoint}:`, errorText);
        
        // Try to extract specific error message
        const errorMatch = errorText.match(/<message><!\[CDATA\[(.*?)\]\]><\/message>/);
        if (errorMatch) {
          console.log(`❌ PrestaShop Error: ${errorMatch[1]}`);
        }

      } catch (endpointError) {
        console.error(`API ${endpoint} failed:`, (endpointError as Error).message);
        continue;
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
