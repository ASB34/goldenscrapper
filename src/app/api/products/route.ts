import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { XauService } from '@/lib/xau-service';
import * as cheerio from 'cheerio';
import axios from 'axios';

export async function GET() {
  // TEMPORARY: Skip authentication for testing
  // if (!(await isAuthenticated())) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  try {
    // TEMPORARY: Mock user for testing
    // const user = await getCurrentUser();
    // if (!user) {
    //   return NextResponse.json({ error: 'User not found' }, { status: 401 });
    // }
    const mockUser = { id: '550e8400-e29b-41d4-a716-446655440000' };

    const products = await prisma.product.findMany({
      where: { userId: mockUser.id },
      orderBy: { createdAt: 'desc' }
    });

    // Normalize snake_case rows from Supabase into camelCase shape expected by client
    const normalizeProductRow = (row: any) => ({
      id: row.id,
      etsyId: row.etsy_id ?? row.etsyId,
      originalTitle: row.original_title ?? row.originalTitle ?? row.title ?? '',
      originalDescription: row.original_description ?? row.originalDescription ?? row.description ?? '',
      originalKeywords: row.original_keywords ?? row.originalKeywords ?? row.keywords ?? [],
      originalImages: row.original_images ?? row.originalImages ?? row.images ?? [],
      originalVideos: row.original_videos ?? row.originalVideos ?? row.videos ?? [],
      aiRewrittenContent: row.ai_rewritten_content ?? row.aiRewrittenContent ?? {},
      isProcessed: row.is_processed ?? row.isProcessed ?? false,
      isPublished: row.is_published ?? row.isPublished ?? false,
      publishedTo: row.published_to ?? row.publishedTo ?? {},
      createdAt: row.created_at ?? row.createdAt,
      updatedAt: row.updated_at ?? row.updatedAt,
      pricing: row.pricing ?? row.pricing,
      specifications: row.specifications ?? row.specifications,
      variants: row.variants ?? row.variants,
      category: row.category,
      vendor: row.vendor,
      sku: row.sku,
      sourceUrl: row.source_url ?? row.sourceUrl
    });

    const normalized = products.map(normalizeProductRow);
    return NextResponse.json({ products: normalized });
  } catch (error) {
    console.error('Products GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // TEMPORARY: Skip authentication for testing
  // if (!(await isAuthenticated())) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  try {
    console.log('Products POST: Starting request');
    const { action, productUrl } = await request.json();
    console.log('Products POST: Action:', action, 'URL:', productUrl);

    if (action === 'fetch-product') {
      console.log('Products POST: Calling fetchProductFromUrl');
      return await fetchProductFromUrl(productUrl);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Products POST error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: 'Internal server error: ' + error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, { status: 500 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// URL normalization function
function normalizeUrl(url: string): string {
  if (!url) return url;
  
  // Remove whitespace
  url = url.trim();
  
  // Add https:// if missing protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  // Ensure it's an Etsy URL
  if (!url.includes('etsy.com')) {
    throw new Error('Only Etsy URLs are supported');
  }
  
  console.log('🔗 URL normalized:', url);
  return url;
}

async function fetchProductFromUrl(productUrl: string) {
  try {
    console.log('🔗 Starting real product fetch for URL:', productUrl);

    // Force USD currency by modifying URL
    try {
      const urlObj = new URL(productUrl);
      urlObj.searchParams.set('currency', 'USD');
      urlObj.searchParams.set('ref', 'shop_home_active_1'); // Organic traffic simulation
      productUrl = urlObj.toString();
      console.log('🔗 USD Modified URL:', productUrl);
    } catch (modifyError) {
      console.error('🔗 URL modification error:', modifyError);
      // Continue with original URL if modification fails
    }

    // Normalize the URL
    try {
      productUrl = normalizeUrl(productUrl);
    } catch (urlError: any) {
      console.error('🔗 URL normalization error:', urlError.message);
      return NextResponse.json({ error: urlError.message || 'Invalid URL format' }, { status: 400 });
    }

    // Extract product ID from URL for database uniqueness
    const productId = extractProductIdFromUrl(productUrl);
    if (!productId) {
      return NextResponse.json({ error: 'Invalid product URL format' }, { status: 400 });
    }

    let htmlContent = '';

    try {
      // First try with axios and realistic headers
      const response = await axios.get(productUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9,tr;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0',
          'Referer': 'https://www.google.com/',
          'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"'
        },
        timeout: 15000,
        maxRedirects: 5
      });
      htmlContent = response.data;
    } catch (axiosError: any) {
      // If axios fails with 403, try Puppeteer approach
      if (axiosError.response?.status === 403) {
        console.log('Axios blocked with 403, trying Puppeteer...');
        htmlContent = await fetchWithPuppeteer(productUrl);
      } else {
        throw axiosError;
      }
    }

    const $ = cheerio.load(htmlContent);

    // Debug: Check page structure
    console.log('🔍 Page analysis:');
    console.log('  - Page title:', $('title').text());
    console.log('  - Elements with "price" in class:', $('[class*="price"]').length);
    console.log('  - Elements with "currency" in class:', $('[class*="currency"]').length);
    console.log('  - Elements with data-test-id:', $('[data-test-id]').length);
    const testIds = $('[data-test-id]').slice(0, 10).map((i, el) => $(el).attr('data-test-id')).get();
    console.log('  - First 10 data-test-ids:', testIds);

    // Extract product information from Etsy page
    const productData = extractEtsyProductData($, productUrl);

    // Post-process: Convert TRY prices to USD if needed
    if (productData.pricing && 'currency' in productData.pricing && productData.pricing.currency === 'TRY') {
      console.log('💱 Converting TRY prices to USD...');
      const exchangeRate = 27.5; // 1 USD = 27.5 TRY (güncel kur)

      const convertPrice = (tryPrice: string) => {
        const usdPrice = parseFloat(tryPrice) / exchangeRate;
        return usdPrice.toFixed(2);
      };

      if (productData.pricing.price) {
        productData.pricing.price = convertPrice(productData.pricing.price);
      }
      if (productData.pricing.comparePrice) {
        productData.pricing.comparePrice = convertPrice(productData.pricing.comparePrice);
      }
      if ('minPrice' in productData.pricing && productData.pricing.minPrice) {
        productData.pricing.minPrice = convertPrice(productData.pricing.minPrice);
      }
      if ('maxPrice' in productData.pricing && productData.pricing.maxPrice) {
        productData.pricing.maxPrice = convertPrice(productData.pricing.maxPrice);
      }

      // Convert variant prices
      if (productData.variants) {
        productData.variants.forEach((variant: any) => {
          if (variant.options) {
            variant.options.forEach((option: any) => {
              if (option.price && option.currency === 'TRY') {
                option.price = convertPrice(option.price);
                option.currency = 'USD';
              }
            });
          }
        });
      }

      productData.pricing.currency = 'USD';
      console.log('✅ Prices converted to USD:', productData.pricing);
    }

    // Post-process: Convert to XAU (Gold) for PrestaShop integration
    if (productData.pricing && 'currency' in productData.pricing) {
      try {
        console.log('🥇 Converting prices to XAU for PrestaShop...');
        const sourceCurrency = productData.pricing.currency;

        // Convert main pricing to XAU
        const xauPricing = await XauService.convertPricingToXau(productData.pricing, sourceCurrency);

        // Convert variants to XAU
        let xauVariants = null;
        if (productData.variants && productData.variants.length > 0) {
          xauVariants = await XauService.convertVariantsToXau(productData.variants, sourceCurrency);
        }

        // Store both original and XAU pricing (using any type for flexibility)
        (productData as any).originalPricing = { ...productData.pricing };
        (productData as any).xauPricing = xauPricing;
        (productData as any).xauVariants = xauVariants;

        console.log('✅ XAU Conversion completed:');
        console.log('- Original pricing:', (productData as any).originalPricing);
        console.log('- XAU pricing:', (productData as any).xauPricing);

      } catch (error) {
        console.error('❌ XAU conversion failed:', error);
        // Continue without XAU conversion if it fails
      }
    }

    console.log('🔍 Enhanced Product Data Debug:');
    console.log('- Title:', productData.title);
    console.log('- Title type:', typeof productData.title);
    console.log('- Title length:', productData.title?.length);
    console.log('- Description:', productData.description);
    console.log('- Description type:', typeof productData.description);
    console.log('- Description length:', productData.description?.length);
    console.log('- Original Pricing:', (productData as any).originalPricing || productData.pricing);
    console.log('- XAU Pricing:', (productData as any).xauPricing);
    console.log('- Variants:', productData.variants);
    console.log('- Specifications:', productData.specifications);
    console.log('- Images count:', productData.images?.length || 0);
    console.log('- Category:', productData.category);
    console.log('- Vendor:', productData.vendor);

    // Validate required fields before saving
    if (!productData.title || productData.title.trim() === '') {
      console.error('❌ Title is empty or null:', productData.title);
      return NextResponse.json({ error: 'Product title is required' }, { status: 400 });
    }

    if (!productData.description || productData.description.trim() === '') {
      console.error('❌ Description is empty or null:', productData.description);
      return NextResponse.json({ error: 'Product description is required' }, { status: 400 });
    }

    if (!productData.title) {
      return NextResponse.json({ error: 'Could not extract product information' }, { status: 400 });
    }

    // Get current user for saving product
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Save product to database
    console.log('� Saving product to database...');
    const savedProduct = await prisma.product.create({
      data: {
        userId: user.id,
        originalTitle: productData.title,
        originalDescription: productData.description,
        originalKeywords: productData.keywords,
        originalImages: productData.images,
        originalVideos: productData.videos || [],
        pricing: productData.pricing,
        specifications: productData.specifications,
        variants: productData.variants,
        category: productData.category,
        vendor: productData.vendor,
        sku: productData.sku,
        sourceUrl: productData.sourceUrl,
        xauPricing: (productData as any).xauPricing,
        isProcessed: false,
        isPublished: false,
        publishedTo: {},
        aiRewrittenContent: {}
      }
    });

    console.log('✅ Product saved to database with ID:', savedProduct.id);

    // Normalize product data for response
    const normalizedProduct = {
      id: savedProduct.id,
      etsyId: savedProduct.etsyId,
      originalTitle: savedProduct.originalTitle,
      originalDescription: savedProduct.originalDescription,
      originalKeywords: savedProduct.originalKeywords,
      originalImages: savedProduct.originalImages,
      originalVideos: savedProduct.originalVideos,
      pricing: savedProduct.pricing,
      specifications: savedProduct.specifications,
      variants: savedProduct.variants,
      category: savedProduct.category,
      vendor: savedProduct.vendor,
      sku: savedProduct.sku,
      sourceUrl: savedProduct.sourceUrl,
      xauPricing: savedProduct.xauPricing,
      isProcessed: savedProduct.isProcessed,
      isPublished: savedProduct.isPublished,
      publishedTo: savedProduct.publishedTo,
      createdAt: savedProduct.createdAt ? savedProduct.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: savedProduct.updatedAt ? savedProduct.updatedAt.toISOString() : new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      message: 'Product fetched and saved successfully',
      product: normalizedProduct
    });
  } catch (error) {
    console.error('Product fetch error:', error);
    return NextResponse.json({
      error: 'Failed to fetch product from URL. Please check the URL and try again.'
    }, { status: 500 });
  }
}

async function fetchWithPuppeteer(url: string): Promise<string> {
  let browser: any = null;
  let page: any = null;

  try {
    console.log('🤖 Starting enhanced Puppeteer scraping for URL:', url);

    // Import Puppeteer with manual stealth
    const puppeteer = await import('puppeteer');

    // Launch browser with enhanced stealth options (headless disabled for manual captcha solving)
    browser = await puppeteer.default.launch({
      headless: false, // Disabled headless for manual captcha solving
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-blink-features=AutomationControlled',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-default-apps',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-ipc-flooding-protection',
        '--disable-popup-blocking',
        '--disable-hang-monitor',
        '--disable-prompt-on-repost',
        '--force-color-profile=srgb',
        '--metrics-recording-only',
        '--no-default-browser-check',
        '--password-store=basic',
        '--use-mock-keychain',
        '--no-service-autorun',
        '--export-tagged-pdf',
        '--disable-search-engine-choice-screen',
        '--disable-component-extensions-with-background-pages',
        '--disable-background-networking',
        '--disable-component-update',
        '--disable-domain-reliability',
        '--disable-client-side-phishing-detection',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-field-trial-config',
        '--disable-back-forward-cache',
        '--disable-hang-monitor',
        '--disable-ipc-flooding-protection',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--force-color-profile=srgb',
        '--metrics-recording-only',
        '--no-default-browser-check',
        '--disable-component-extensions-with-background-pages',
        '--disable-background-networking',
        '--disable-component-update',
        '--disable-domain-reliability',
        '--disable-client-side-phishing-detection',
        '--disable-field-trial-config',
        '--disable-back-forward-cache'
      ],
      ignoreDefaultArgs: ['--enable-automation']
    });

    page = await browser.newPage();

    // Set realistic viewport
    await page.setViewport({
      width: 1366 + Math.floor(Math.random() * 100),
      height: 768 + Math.floor(Math.random() * 100),
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: true,
      isMobile: false
    });

    // Enhanced stealth: Remove all webdriver traces
    await page.evaluateOnNewDocument(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Mock languages and plugins
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Mock permissions
      const originalQuery = (window.navigator.permissions as any).query;
      (window.navigator.permissions as any).query = (parameters: any) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );

      // Mock hardware concurrency
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 4,
      });

      // Mock device memory
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8,
      });

      // Override chrome object
      if (!(window as any).chrome) {
        (window as any).chrome = {
          runtime: {},
          loadTimes: function() {},
          csi: function() {},
          app: {}
        };
      }

      // Mock iframe to appear as if it's not in an iframe
      Object.defineProperty(window, 'top', {
        get: () => window,
      });

      // Remove automation indicators (safely)
      try {
        delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Array;
        delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Promise;
        delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
        delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_JSON;
        delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Object;
        delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Proxy;
      } catch (e) {
        // Ignore errors when properties don't exist
      }
    });

    // Set user agent with more realistic browser fingerprint
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Set additional realistic headers
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      'Referer': 'https://www.google.com/search?q=etsy+gold+skull+pendant',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"'
    });

    // Add random mouse movements and scrolling to appear more human
    await page.evaluateOnNewDocument(() => {
      // Random mouse movements
      let mouseX = 0;
      let mouseY = 0;

      const moveMouse = () => {
        mouseX += Math.random() * 10 - 5;
        mouseY += Math.random() * 10 - 5;
        mouseX = Math.max(0, Math.min(window.innerWidth, mouseX));
        mouseY = Math.max(0, Math.min(window.innerHeight, mouseY));
      };

      setInterval(moveMouse, 1000 + Math.random() * 2000);

      // Override console methods to avoid detection
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;

      console.log = (...args) => {
        if (!args[0]?.includes?.('webdriver')) {
          originalLog.apply(console, args);
        }
      };

      console.error = (...args) => {
        if (!args[0]?.includes?.('webdriver')) {
          originalError.apply(console, args);
        }
      };

      console.warn = (...args) => {
        if (!args[0]?.includes?.('webdriver')) {
          originalWarn.apply(console, args);
        }
      };
    });

    console.log('🚗 Navigating to URL with realistic timing...');

    // Navigate with realistic timing and error handling
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 120000 // Increased timeout for manual captcha solving
    });

    // Wait for body and add realistic delays
    await page.waitForSelector('body', { timeout: 30000 });

    // Wait for potential captcha and give user time to solve it
    console.log('⏳ Waiting for potential captcha... Please solve it manually if it appears.');
    await new Promise(resolve => setTimeout(resolve, 15000)); // Give user 15 seconds to solve captcha

    // Check if we're still on captcha page
    const currentUrl = page.url();
    if (currentUrl.includes('captcha-delivery.com') || currentUrl.includes('captcha')) {
      console.log('🚫 Still on captcha page. Waiting longer for manual solving...');
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait another 30 seconds
    }

    // Simulate human-like behavior with multiple interactions
    await page.evaluate(() => {
      // Random scroll to simulate reading
      const scrollAmount = Math.random() * 300 + 100;
      window.scrollTo(0, scrollAmount);

      // Random delay before next action
      return new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 2000));
    });

    // Additional wait for dynamic content - increased significantly
    await new Promise(resolve => setTimeout(resolve, 12000 + Math.random() * 8000));

    // Try to wait for specific Etsy elements
    try {
      await page.waitForSelector('[data-test-id="listing-page-title"], h1, .listing-title, .shop-name', { timeout: 20000 });
      console.log('✅ Found Etsy-specific elements');
    } catch (e) {
      console.log('⚠️ Etsy-specific elements not found, continuing anyway');
    }

    // More human-like interactions
    await page.evaluate(() => {
      // Simulate mouse movement
      const event = new MouseEvent('mousemove', {
        clientX: Math.random() * window.innerWidth,
        clientY: Math.random() * window.innerHeight
      });
      document.dispatchEvent(event);

      // Another scroll
      window.scrollTo(0, Math.random() * 500 + 200);
    });

    // Final wait
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));

    // Debug: Log page content details
    const content = await page.content();
    console.log('🔍 Enhanced page content analysis:');
    console.log('  - Content length:', content.length);
    console.log('  - Contains "etsy":', content.toLowerCase().includes('etsy'));
    console.log('  - Contains "gold":', content.toLowerCase().includes('gold'));
    console.log('  - Contains "skull":', content.toLowerCase().includes('skull'));
    console.log('  - Contains "price":', content.toLowerCase().includes('price'));
    console.log('  - Contains "product":', content.toLowerCase().includes('product'));
    console.log('  - Contains "listing":', content.toLowerCase().includes('listing'));
    console.log('  - First 1000 chars:', content.substring(0, 1000));

    console.log('✅ Successfully scraped HTML content with enhanced stealth, length:', content.length);

    return content;

  } catch (error) {
    console.error('❌ Enhanced Puppeteer scraping failed:', error);
    throw new Error('Enhanced Puppeteer scraping failed: ' + (error as Error).message);
  } finally {
    // Always close browser
    if (page) {
      try {
        await page.close();
      } catch (closeError) {
        console.error('❌ Error closing page:', closeError);
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('❌ Error closing browser:', closeError);
      }
    }
  }
}

function extractProductIdFromUrl(url: string): string | null {
  try {
    // Etsy URL patterns:
    // https://www.etsy.com/listing/123456789/product-name
    // https://www.etsy.com/tr/listing/123456789/product-name
    const match = url.match(/\/listing\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function extractEtsyProductData($: cheerio.CheerioAPI, url: string) {
  console.log('🚀 STARTING extractEtsyProductData function');
  console.log('🚀 URL:', url);
  console.log('🚀 $ object:', typeof $);
  
  try {
    console.log('🚀 Trying JSON-LD extraction...');
    // First try to extract from JSON-LD structured data
    let productData = extractFromJsonLd($);
    console.log('🚀 JSON-LD result:', productData.title ? 'FOUND' : 'NOT FOUND');
    
    if (productData.title) {
      console.log('🔄 JSON-LD found title, but checking for missing data...');
      console.log('🔄 JSON-LD Pricing:', productData.pricing ? 'FOUND' : 'MISSING');
      console.log('🔄 JSON-LD Variants:', productData.variants ? 'FOUND' : 'MISSING');
      console.log('🔄 JSON-LD Specs:', productData.specifications ? 'FOUND' : 'MISSING');
      
      // If critical data is missing from JSON-LD, enhance it with HTML parsing
      if (!productData.pricing || !productData.variants || !(productData as any).specifications) {
        console.log('🔄 Enhancing JSON-LD data with HTML parsing...');
        
        // Extract missing pricing from HTML if not found in JSON-LD
        if (!productData.pricing) {
          console.log('🔄 Extracting pricing from HTML...');
          productData.pricing = extractPricingInfo($);
        }
        
        // Extract missing variants from HTML if not found in JSON-LD
        if (!productData.variants) {
          console.log('🔄 Extracting variants from HTML...');
          (productData as any).variants = extractVariants($);
        }
        
        // Extract missing specifications from HTML if not found in JSON-LD
        if (!(productData as any).specifications) {
          console.log('🔄 Extracting specifications from HTML...');
          productData.specifications = extractSpecifications($, productData.description || '');
        }
      }
      
      return { ...productData, sourceUrl: url };
    }

    // Enhanced HTML scraping with more detailed data extraction
    console.log('Extracting detailed product data from Etsy...');

    // Extract title - make it shorter and more appealing
    let rawTitle = $('h1[data-test-id="listing-page-title"]').text().trim() ||
                   $('h1').first().text().trim() ||
                   $('title').text().replace(' | Etsy', '').replace(' - Etsy', '').trim();

    // Clean and shorten title for better presentation
    const title = cleanProductTitle(rawTitle);

    // Extract comprehensive description with specifications
    let description = '';
    
    // Try multiple selectors for description
    const descriptionSelectors = [
      '[data-test-id="listing-page-product-details"]',
      '.listing-page-desc',
      '.shop2-listing-description',
      '[data-test-id="description-text"]',
      '.description-text'
    ];
    
    for (const selector of descriptionSelectors) {
      const desc = $(selector).text().trim();
      if (desc && desc.length > description.length) {
        description = desc;
      }
    }
    
    // Fallback to meta description
    if (!description) {
      description = $('meta[name="description"]').attr('content') || '';
    }

    // Extract pricing information
    console.log('🔍 About to call extractPricingInfo...');
    console.log('🔍 $ object type:', typeof $);
    console.log('🔍 $ has html method:', typeof $.html === 'function');
    
    let pricing;
    try {
      console.log('🔍 Calling extractPricingInfo NOW...');
      pricing = extractPricingInfo($);
      console.log('💰 Pricing result SUCCESS:', pricing);
    } catch (pricingError) {
      console.error('💰 ERROR in extractPricingInfo:', pricingError);
      pricing = null;
    }
    
    // Extract specifications (weight, dimensions, materials)
    console.log('🔍 Calling extractSpecifications...');
    const specifications = extractSpecifications($, description);
    console.log('📏 Specifications result:', specifications);

    // Extract variants/options (color, size, etc.)
    console.log('🔍 Calling extractVariants...');
    const variants = extractVariants($);
    console.log('🎨 Variants result:', variants);

    // Extract high-quality images
    console.log('🔍 Calling extractHighQualityImages...');
    const images = extractHighQualityImages($);
    console.log('🖼️ Images result count:', images?.length);

    // Extract category/product type
    console.log('🔍 Calling extractCategory...');
    const category = extractCategory($);
    console.log('📂 Category result:', category);

    // Extract enhanced keywords including materials, colors, styles
    console.log('🔍 Calling extractEnhancedKeywords...');
    const keywords = extractEnhancedKeywords($, title, description, specifications);
    console.log('🔑 Keywords result:', keywords);

    // Extract vendor/shop information
    console.log('🔍 Calling extractVendorInfo...');
    const vendor = extractVendorInfo($);
    console.log('🏪 Vendor result:', vendor);

    return {
      title: title || 'Handcrafted Item',
      description: enhanceDescription(description, specifications),
      keywords: keywords,
      images: images,
      videos: [], // Videos are harder to extract, can be added later
      sourceUrl: url,
      // Additional Shopify-specific data
      pricing: pricing,
      specifications: specifications,
      variants: variants,
      category: category,
      vendor: vendor,
      weight: specifications.weight,
      material: specifications.material,
      sku: `ETY-${extractProductIdFromUrl(url)}`
    };
  } catch (error) {
    console.error('Error extracting product data:', error);
    return {
      title: 'Artisan Crafted Item',
      description: 'Beautifully handcrafted item with attention to detail.',
      keywords: ['handmade', 'artisan', 'craft'],
      images: [],
      videos: [],
      sourceUrl: url,
      pricing: { price: null, comparePrice: null },
      specifications: {},
      variants: [],
      category: 'Handmade',
      vendor: 'Artisan Shop'
    };
  }
}

// Helper function to clean and shorten product titles
function cleanProductTitle(rawTitle: string): string {
  if (!rawTitle) return 'Handcrafted Item';
  
  // Remove common unnecessary words and phrases
  let cleaned = rawTitle
    .replace(/\b(handmade|handcrafted|custom|personalized|unique|beautiful|amazing|perfect|best|high quality|premium)\b/gi, '')
    .replace(/\b(gift for|present for|birthday|wedding|anniversary)\b/gi, '')
    .replace(/[-–—,]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
    
  // Limit length to ~60 characters for better SEO
  if (cleaned.length > 60) {
    const words = cleaned.split(' ');
    let shortened = '';
    for (const word of words) {
      if ((shortened + ' ' + word).length <= 60) {
        shortened += (shortened ? ' ' : '') + word;
      } else {
        break;
      }
    }
    cleaned = shortened || cleaned.substring(0, 60);
  }
  
  return cleaned || 'Artisan Item';
}

// Extract comprehensive pricing information
function extractPricingInfo($: cheerio.CheerioAPI) {
  const pricing = { 
    price: null as string | null, 
    comparePrice: null as string | null,
    currency: 'USD', // Default to USD for international commerce
    minPrice: null as string | null,
    maxPrice: null as string | null,
    onSale: false,
    priceRange: null as string | null
  };
  
  console.log('💰 START: Extracting pricing information (prioritizing USD)...');
  
  try {
    console.log('💰 Page has elements:', $('*').length);
    console.log('💰 Title element exists:', $('title').length > 0);
    
    // Since data-test-id elements = 0, let's use class-based selectors
    const priceSelectors = [
      // Primary price selectors
      '[class*="currency-value"]',
      '.currency-value',
      '[class*="price"] [class*="currency"]',
      '[class*="price"] span',
      '.price span',
      '[class*="price"]',
      // Etsy specific patterns
      'p[class*="price"]',
      'span[class*="price"]',
      'div[class*="price"]'
    ];
    
    console.log('💰 Testing price selectors...');
    for (let i = 0; i < priceSelectors.length && !pricing.price; i++) {
      const selector = priceSelectors[i];
      const elements = $(selector);
      console.log(`💰 [${i+1}/${priceSelectors.length}] "${selector}" → ${elements.length} elements`);
      
      if (elements.length > 0) {
        // Check first few elements for prices
        for (let j = 0; j < Math.min(3, elements.length); j++) {
          const elem = elements.eq(j);
          const text = elem.text().trim();
          
          if (text.length > 0) {
            console.log(`  💰 Element ${j+1}: "${text}"`);
            
            // Try to extract price from this element
            const priceMatch = text.match(/[\d,.]+/);
            if (priceMatch && priceMatch[0].length > 0) {
              const priceValue = priceMatch[0];
              
              // Look for currency in the text or parent - prioritize USD
              const fullText = text + ' ' + elem.parent().text();
              
              // Enhanced currency detection with USD priority
              let detectedCurrency = 'USD'; // Default to USD
              
              if (fullText.includes('$') || fullText.includes('USD')) {
                detectedCurrency = 'USD';
              } else if (fullText.includes('€') || fullText.includes('EUR')) {
                detectedCurrency = 'EUR';
              } else if (fullText.includes('£') || fullText.includes('GBP')) {
                detectedCurrency = 'GBP';
              } else if (fullText.includes('TL') || fullText.includes('TRY') || fullText.includes('₺')) {
                detectedCurrency = 'TRY';
              } else if (fullText.includes('¥') || fullText.includes('JPY')) {
                detectedCurrency = 'JPY';
              }
              
              pricing.currency = detectedCurrency;
              
              pricing.price = priceValue;
              console.log(`✅ FOUND PRICE: ${pricing.currency} ${priceValue} from selector "${selector}"`);
              break; // Found price, exit inner loop
            }
          }
        }
      }
    }
    
    // If no price found, try searching for any text with currency symbols (prioritize USD)
    if (!pricing.price) {
      console.log('💰 Fallback: searching for any price patterns (USD priority)...');
      const allText = $('body').text();
      
      // Look for USD patterns first
      let priceMatches = allText.match(/\$\s*(\d+(?:\.\d{2})?)/g);
      if (!priceMatches || priceMatches.length === 0) {
        // Then try other currencies
        priceMatches = allText.match(/(€|£|¥|₺)\s*(\d+(?:\.\d{2})?)/g);
      }
      
      if (priceMatches && priceMatches.length > 0) {
        console.log(`💰 Found price patterns: ${priceMatches.slice(0, 3).join(', ')}`);
        const firstMatch = priceMatches[0];
        const priceValue = firstMatch.replace(/[^\d.,]/g, '');
        if (priceValue) {
          pricing.price = priceValue;
          pricing.currency = firstMatch.includes('$') ? 'USD' : 
                           firstMatch.includes('€') ? 'EUR' : 
                           firstMatch.includes('£') ? 'GBP' : 
                           firstMatch.includes('₺') ? 'TRY' : 'USD';
          console.log(`✅ Fallback price found: ${pricing.currency} ${priceValue}`);
        }
      }
    }
    
    // Look for original/compare price (crossed out price)
    const comparePriceSelectors = [
      '.price-was .currency-value',
      '.original-price .currency-value', 
      '[data-test-id="compare-price"] .currency-value',
      '.crossed-out-price .currency-value',
      '.strike-through .currency-value',
      '.line-through .currency-value'
    ];
    
    for (const selector of comparePriceSelectors) {
      const compareElement = $(selector).first();
      if (compareElement.length > 0) {
        const compareText = compareElement.text().trim();
        const compareValue = compareText.replace(/[^\d.,]/g, '');
        if (compareValue) {
          pricing.comparePrice = compareValue;
          pricing.onSale = true;
          console.log(`✅ Found original price: ${pricing.currency} ${compareValue} (ON SALE)`);
          break;
        }
      }
    }
    
    // Check for price ranges (min-max pricing)
    const priceRangeSelectors = [
      '.price-range',
      '.listing-price-range',
      '[data-test-id="price-range"]'
    ];
    
    for (const selector of priceRangeSelectors) {
      const rangeElement = $(selector).first();
      if (rangeElement.length > 0) {
        const rangeText = rangeElement.text().trim();
        const priceMatches = rangeText.match(/(\d+(?:\.\d{2})?)/g);
        
        if (priceMatches && priceMatches.length >= 2) {
          pricing.minPrice = priceMatches[0];
          pricing.maxPrice = priceMatches[priceMatches.length - 1];
          pricing.price = pricing.minPrice; // Use min as default price
          console.log(`✅ Found price range: ${pricing.currency} ${pricing.minPrice} - ${pricing.maxPrice}`);
          break;
        }
      }
    }
    
    // Fallback: extract from structured data
    if (!pricing.price) {
      $('script[type="application/ld+json"]').each((_, elem) => {
        try {
          const jsonData = JSON.parse($(elem).text());
          if (jsonData.offers && jsonData.offers.price) {
            pricing.price = jsonData.offers.price.toString();
            pricing.currency = jsonData.offers.priceCurrency || pricing.currency;
            console.log(`✅ Found price from structured data: ${pricing.currency} ${pricing.price}`);
          }
        } catch (parseError) {
          // Skip invalid JSON
        }
      });
    }
    
  } catch (error) {
    console.error('Error extracting pricing:', error);
  }
  
  return pricing;
}

// Extract comprehensive specifications like weight, dimensions, materials, style
function extractSpecifications($: cheerio.CheerioAPI, description: string) {
  const specs: any = {};
  
  try {
    console.log('📏 Extracting product specifications...');
    
    // Enhanced selectors for product details
    const detailSelectors = [
      '[data-test-id="listing-page-details"] tr',
      '[data-test-id="product-details"] tr',
      '.listing-details tr',
      '.product-details tr',
      '.listing-info tr',
      '.item-details tr'
    ];
    
    // Extract from structured product details tables
    detailSelectors.forEach(selector => {
      $(selector).each((_, row) => {
        const cells = $(row).find('td, th');
        if (cells.length >= 2) {
          const label = cells.eq(0).text().trim().toLowerCase();
          const value = cells.eq(1).text().trim();
          
          if (value && value.length > 0) {
            if (label.includes('material') || label.includes('materials')) {
              specs.material = value;
              console.log(`✅ Material: ${value}`);
            }
            if (label.includes('weight')) {
              specs.weight = extractWeight(value);
              console.log(`✅ Weight: ${specs.weight}g`);
            }
            if (label.includes('dimension') || label.includes('size') || label.includes('measurements')) {
              specs.dimensions = value;
              console.log(`✅ Dimensions: ${value}`);
            }
            if (label.includes('color') || label.includes('colour')) {
              specs.color = value;
              console.log(`✅ Color: ${value}`);
            }
            if (label.includes('style') || label.includes('design')) {
              specs.style = value;
              console.log(`✅ Style: ${value}`);
            }
            if (label.includes('occasion') || label.includes('use')) {
              specs.occasion = value;
              console.log(`✅ Occasion: ${value}`);
            }
            if (label.includes('care') || label.includes('maintenance')) {
              specs.care = value;
              console.log(`✅ Care Instructions: ${value}`);
            }
          }
        }
      });
    });
    
    // Extract from item details section (alternative layout)
    const itemDetailSelectors = [
      '.listing-item-details dt',
      '.product-info dt',
      '.item-info dt'
    ];
    
    itemDetailSelectors.forEach(selector => {
      $(selector).each((_, elem) => {
        const label = $(elem).text().trim().toLowerCase();
        const value = $(elem).next('dd').text().trim();
        
        if (value && value.length > 0) {
          if (label.includes('material')) specs.material = value;
          if (label.includes('weight')) specs.weight = extractWeight(value);
          if (label.includes('dimension') || label.includes('size')) specs.dimensions = value;
          if (label.includes('color')) specs.color = value;
          if (label.includes('style')) specs.style = value;
        }
      });
    });
    
    // Extract from description text using enhanced patterns
    const patterns = [
      // Weight patterns
      { regex: /(?:weight|weighs?|wt\.?)[:\s]*(\d+(?:\.\d+)?)\s*(g|gram|kg|kilogram|oz|ounce|lb|pound)s?/gi, field: 'weight' },
      // Dimension patterns
      { regex: /(?:size|dimensions?|measures?)[:\s]*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(?:[x×]\s*(\d+(?:\.\d+)?))?\s*(mm|cm|m|in|inch|ft|feet)/gi, field: 'dimensions' },
      // Material patterns
      { regex: /(?:made from|material|crafted from|composed of)[:\s]*([a-zA-Z\s,]+)(?:\.|$)/gi, field: 'material' },
      // Color patterns
      { regex: /(?:color|colour)[:\s]*([a-zA-Z\s,]+)(?:\.|$)/gi, field: 'color' },
      // Style patterns
      { regex: /(?:style|design)[:\s]*([a-zA-Z\s,]+)(?:\.|$)/gi, field: 'style' }
    ];
    
    patterns.forEach(pattern => {
      const matches = description.matchAll(pattern.regex);
      for (const match of matches) {
        if (pattern.field === 'weight' && !specs.weight) {
          specs.weight = extractWeight(match[0]);
        } else if (pattern.field === 'dimensions' && !specs.dimensions) {
          specs.dimensions = match[0].replace(/(?:size|dimensions?|measures?)[:\s]*/gi, '').trim();
        } else if (!specs[pattern.field]) {
          specs[pattern.field] = match[1] ? match[1].trim() : match[0].split(/[:\s]/)[1]?.trim();
        }
      }
    });
    
    // Extract weight from description with enhanced patterns
    if (!specs.weight) {
      const weightMatch = description.match(/(\d+(?:\.\d+)?)\s*(g|gram|kg|kilogram|oz|ounce|lb|pound)s?/i);
      if (weightMatch) {
        specs.weight = extractWeight(weightMatch[0]);
      }
    }
    
    // Extract materials from description
    const materials = ['gold', 'silver', 'leather', 'cotton', 'silk', 'wood', 'ceramic', 'glass', 'metal', 'plastic', 'fabric'];
    for (const material of materials) {
      if (description.toLowerCase().includes(material) && !specs.material) {
        specs.material = material.charAt(0).toUpperCase() + material.slice(1);
        break;
      }
    }
  } catch (error) {
    console.error('Error extracting specifications:', error);
  }
  
  return specs;
}

// Extract weight value and convert to grams
// Enhanced weight extraction with multiple unit support
function extractWeight(weightText: string): number | null {
  try {
    const match = weightText.match(/(\d+(?:\.\d+)?)\s*(g|gram|kg|kilogram|oz|ounce|lb|pound|lbs)/i);
    if (!match) return null;
    
    let weight = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    
    // Convert to grams for standardization
    if (unit.includes('kg')) weight *= 1000;
    else if (unit.includes('oz')) weight *= 28.35;
    else if (unit.includes('lb') || unit.includes('pound')) weight *= 453.59;
    // g/gram stays as is
    
    const result = Math.round(weight);
    console.log(`📏 Weight extracted: ${weightText} → ${result}g`);
    return result;
  } catch (error) {
    console.error('Error extracting weight:', error);
    return null;
  }
}

// Extract product variants (colors, sizes, etc.)
function extractVariants($: cheerio.CheerioAPI) {
  const variants: any[] = [];
  
  try {
    console.log('🔍 Extracting product variants and combinations...');
    
    // Look for variation selectors - Etsy uses specific patterns
    const selectors = [
      'select[id*="variation-selector"]',
      'select[class*="variation"]',
      'select[data-variation-number]'
    ];
    
    selectors.forEach(selector => {
      $(selector).each((index, elem) => {
        const $select = $(elem);
        const variationNumber = $select.attr('data-variation-number') || index.toString();
        const selectId = $select.attr('id') || `variation-${index}`;
        
        // Skip if we already processed this variant
        if (variants.some(v => v.selectId === selectId)) {
          return;
        }
        
        // Find the label for this variation
        const labelId = `label-${selectId}`;
        const label = $(`#${labelId}`).text().trim() || 
                     $select.closest('div').find('label').first().text().trim() ||
                     $select.prev('label').text().trim() ||
                     `Variation ${variationNumber}`;
        
        const options: any[] = [];
        
        // Extract options with prices
        $select.find('option').each((_, option) => {
          const $option = $(option);
          const optionText = $option.text().trim();
          const optionValue = $option.attr('value');
          
          // Skip empty/placeholder options
          if (!optionText || !optionValue || 
              optionText.includes('Select an option') || 
              optionText.includes('Choose an option')) {
            return;
          }
          
          // Parse option text for name and price
          // Format: "6.3 Inches (58,554.27 TL)" or "Red" or "Size M (100.00 USD)"
          const priceMatch = optionText.match(/\(([0-9,]+\.?[0-9]*)\s*([A-Z]{3}|TL|\$|€|£)\)/);
          const name = optionText.replace(/\s*\([^)]+\)$/, '').trim();
          
          const optionData: any = {
            name: name,
            value: optionValue,
            originalText: optionText
          };
          
          if (priceMatch) {
            const priceValue = priceMatch[1].replace(/,/g, '');
            const currency = priceMatch[2] === 'TL' ? 'TRY' : priceMatch[2];
            optionData.price = priceValue;
            optionData.currency = currency;
            optionData.formattedPrice = `${priceValue} ${currency}`;
          }
          
          options.push(optionData);
        });
        
        if (options.length > 0) {
          console.log(`✅ Found variant: "${label}" with ${options.length} options`);
          options.forEach(opt => {
            console.log(`  - ${opt.name}${opt.price ? ` (${opt.formattedPrice})` : ''}`);
          });
          
          variants.push({
            name: label,
            type: 'dropdown',
            options: options,
            variationNumber: variationNumber,
            selectId: selectId,
            required: true
          });
        }
      });
    });
    
    console.log(`🎯 Total variants found: ${variants.length}`);
    return variants;
    
  } catch (error) {
    console.error('❌ Error extracting variants:', error);
    return [];
  }
}

function extractHighQualityImages($: cheerio.CheerioAPI): string[] {
  const images: string[] = [];
  const imageSet = new Set<string>(); // Avoid duplicates
  
  try {
    console.log('🖼️ Extracting high-quality product images...');
    
    // Enhanced priority selectors for product images
    const imageSelectors = [
      '[data-test-id="listing-page-image"] img',
      '[data-test-id="listing-image"] img',
      '.listing-page-image img',
      '.listing-image img',
      '.product-image img',
      '.shop2-listing-image img',
      '.listing-page-images img',
      '.image-carousel img',
      '[class*="image"] img[src*="etsystatic"]'
    ];
    
    // Extract main product images first
    for (const selector of imageSelectors) {
      $(selector).each((_, elem) => {
        const src = $(elem).attr('src') || 
                   $(elem).attr('data-src') || 
                   $(elem).attr('data-img-src') ||
                   $(elem).attr('data-original-src');
                   
        if (src && (src.includes('etsy') || src.includes('etsystatic'))) {
          // Transform to highest quality version
          let highQualitySrc = src
            .replace(/\/il_\d+x\d+\./g, '/il_fullxfull.')
            .replace(/\/il_\d+xN\./g, '/il_fullxfull.')
            .replace(/\/il_\d+x\d+\//g, '/il_fullxfull/')
            .replace(/\/s\d+\//g, '/s2048/')
            .replace(/\/c_limit,h_\d+,w_\d+\//g, '/c_limit,h_2048,w_2048/');
          
          // Remove query parameters that might limit image quality
          highQualitySrc = highQualitySrc.split('?')[0];
          
          if (!imageSet.has(highQualitySrc)) {
            imageSet.add(highQualitySrc);
            images.push(highQualitySrc);
            console.log(`✅ Found image: ${highQualitySrc.substring(0, 80)}...`);
          }
        }
      });
      
      if (images.length > 5) break; // Stop at first successful selector if we have enough
    }
    
    // Extract thumbnail images and convert to full size
    const thumbnailSelectors = [
      '.listing-page-image-thumbs img',
      '.image-thumbs img',
      '.thumbnail img',
      '[class*="thumb"] img'
    ];
    
    for (const selector of thumbnailSelectors) {
      $(selector).each((_, elem) => {
        const src = $(elem).attr('src') || 
                   $(elem).attr('data-src') ||
                   $(elem).attr('data-img-src');
                   
        if (src && (src.includes('etsy') || src.includes('etsystatic')) && images.length < 15) {
          let highQualitySrc = src
            .replace(/\/il_\d+x\d+\./g, '/il_fullxfull.')
            .replace(/\/s\d+\//g, '/s2048/');
            
          highQualitySrc = highQualitySrc.split('?')[0];
          
          if (!imageSet.has(highQualitySrc)) {
            imageSet.add(highQualitySrc);
            images.push(highQualitySrc);
          }
        }
      });
    }
    
    // Fallback: Extract from structured data (JSON-LD)
    if (images.length === 0) {
      $('script[type="application/ld+json"]').each((_, elem) => {
        try {
          const jsonData = JSON.parse($(elem).text());
          if (jsonData.image) {
            const imageUrls = Array.isArray(jsonData.image) ? jsonData.image : [jsonData.image];
            imageUrls.forEach((url: string) => {
              if (url && (url.includes('etsy') || url.includes('etsystatic'))) {
                const highQualityUrl = url.replace(/\/il_\d+x\d+\./g, '/il_fullxfull.');
                if (!imageSet.has(highQualityUrl)) {
                  imageSet.add(highQualityUrl);
                  images.push(highQualityUrl);
                }
              }
            });
          }
        } catch (parseError) {
          // Skip invalid JSON
        }
      });
    }
    
    // Final fallback to any Etsy images
    if (images.length === 0) {
      $('img').each((_, elem) => {
        const src = $(elem).attr('src') || $(elem).attr('data-src');
        if (src && (src.includes('etsystatic') || src.includes('etsy')) && !src.includes('avatar') && !src.includes('logo')) {
          const cleanSrc = src.replace(/\/il_\d+x\d+\./g, '/il_fullxfull.').split('?')[0];
          if (!imageSet.has(cleanSrc) && images.length < 12) {
            imageSet.add(cleanSrc);
            images.push(cleanSrc);
          }
        }
      });
    }
    
    console.log(`🎯 Total images extracted: ${images.length}`);
    
  } catch (error) {
    console.error('Error extracting images:', error);
  }
  
  return images.slice(0, 12); // Limit to 12 images for performance
}

// Extract product category
function extractCategory($: cheerio.CheerioAPI): string {
  try {
    // Try breadcrumb navigation
    const breadcrumbs = $('[data-test-id="breadcrumb"] a, .breadcrumb a, nav a').map((_, elem) => 
      $(elem).text().trim()
    ).get();
    
    if (breadcrumbs.length > 1) {
      return breadcrumbs[breadcrumbs.length - 2]; // Second to last is usually the category
    }
    
    // Try category meta tags
    const category = $('meta[property="product:category"]').attr('content') ||
                    $('meta[name="category"]').attr('content');
    
    return category || 'Handmade';
  } catch {
    return 'Handmade';
  }
}

// Extract enhanced keywords including materials, colors, styles
function extractEnhancedKeywords($: cheerio.CheerioAPI, title: string, description: string, specifications: any): string[] {
  const keywords: string[] = [];
  
  try {
    // Extract from existing tag elements
    $('[data-test-id="listing-tag-list"] a, .listing-tag a, .tag a').each((_, elem) => {
      const tag = $(elem).text().trim();
      if (tag && !keywords.includes(tag)) {
        keywords.push(tag);
      }
    });

    // Add specifications as keywords
    if (specifications.material) keywords.push(specifications.material.toLowerCase());
    if (specifications.color) keywords.push(specifications.color.toLowerCase());

    // Extract colors from title and description
    const colors = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'brown', 'pink', 'purple', 'orange', 'gold', 'silver'];
    const text = (title + ' ' + description).toLowerCase();
    
    colors.forEach(color => {
      if (text.includes(color) && !keywords.includes(color)) {
        keywords.push(color);
      }
    });

    // Extract styles/types
    const styles = ['vintage', 'modern', 'classic', 'bohemian', 'minimalist', 'rustic', 'elegant', 'casual'];
    styles.forEach(style => {
      if (text.includes(style) && !keywords.includes(style)) {
        keywords.push(style);
      }
    });

    // Generate from title if still not enough keywords
    if (keywords.length < 5) {
      const titleWords = title.toLowerCase().split(/[\s-,]+/)
        .filter(word => word.length > 2 && !['the', 'and', 'for', 'with', 'from'].includes(word))
        .slice(0, 10);
      keywords.push(...titleWords.filter(w => !keywords.includes(w)));
    }
  } catch (error) {
    console.error('Error extracting keywords:', error);
  }
  
  return keywords.slice(0, 15); // Shopify limit
}

// Extract vendor/shop information
function extractVendorInfo($: cheerio.CheerioAPI): string {
  try {
    const vendor = $('[data-test-id="shop-name"] a, .shop-name a, .seller-name').text().trim() ||
                  $('meta[property="product:retailer"]').attr('content') ||
                  'Artisan Shop';
    
    return vendor.replace(/shop|store/gi, '').trim() || 'Artisan Shop';
  } catch {
    return 'Artisan Shop';
  }
}

// Enhance description with specifications
function enhanceDescription(originalDescription: string, specifications: any): string {
  let enhanced = originalDescription;
  
  // Add specifications to description if not already present
  if (specifications.material && !enhanced.toLowerCase().includes(specifications.material.toLowerCase())) {
    enhanced += `\n\nMaterial: ${specifications.material}`;
  }
  
  if (specifications.weight && !enhanced.toLowerCase().includes('weight')) {
    enhanced += `\nWeight: ${specifications.weight}g`;
  }
  
  if (specifications.dimensions && !enhanced.toLowerCase().includes('dimension')) {
    enhanced += `\nDimensions: ${specifications.dimensions}`;
  }
  
  return enhanced.trim();
}

function extractFromJsonLd($: cheerio.CheerioAPI) {
  console.log('📋 STARTING JSON-LD extraction');
  try {
    const jsonLdScripts = $('script[type="application/ld+json"]');
    console.log('📋 Found JSON-LD scripts:', jsonLdScripts.length);
    
    for (let i = 0; i < jsonLdScripts.length; i++) {
      const scriptContent = $(jsonLdScripts[i]).html();
      if (!scriptContent) continue;
      
      try {
        const data = JSON.parse(scriptContent);
        console.log('📋 Parsed JSON-LD data keys:', Object.keys(data));
        console.log('📋 Data type:', data['@type']);
        console.log('📋 Is array:', Array.isArray(data));
        
        // Handle array of JSON-LD objects
        const products = Array.isArray(data) ? data : [data];
        console.log('📋 Products to check:', products.length);
        
        for (const item of products) {
          if (item['@type'] === 'Product' || item.name) {
            console.log('📋 Product found in JSON-LD:', item.name);
            console.log('📋 Has offers:', !!item.offers);
            console.log('📋 Offers type:', typeof item.offers);
            
            // Extract pricing from offers
            let pricing = null;
            if (item.offers) {
              const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
              console.log('📋 Offers object keys:', Object.keys(offers));
              console.log('📋 Offer price:', offers.price);
              console.log('📋 Offer lowPrice:', offers.lowPrice);
              console.log('📋 Offer highPrice:', offers.highPrice);
              console.log('📋 Offer currency:', offers.priceCurrency);
              console.log('📋 Full offers object:', JSON.stringify(offers, null, 2));
              
              if (offers.lowPrice || offers.highPrice || offers.price) {
                // Use lowPrice as main price if available, otherwise use price
                const mainPrice = offers.lowPrice || offers.price;
                const comparePrice = offers.highPrice;
                
                pricing = {
                  price: mainPrice ? mainPrice.toString() : null,
                  currency: offers.priceCurrency || 'USD',
                  comparePrice: comparePrice ? comparePrice.toString() : null,
                  minPrice: offers.lowPrice ? offers.lowPrice.toString() : null,
                  maxPrice: offers.highPrice ? offers.highPrice.toString() : null,
                  onSale: offers.highPrice && offers.lowPrice && offers.lowPrice < offers.highPrice,
                  priceRange: offers.lowPrice && offers.highPrice ? 
                    `${offers.lowPrice} - ${offers.highPrice} ${offers.priceCurrency || 'USD'}` : null
                };
                
                console.log('📋 ✅ JSON-LD pricing extracted:', pricing);
              }
            }
            
            return {
              title: item.name || '',
              description: item.description || '',
              keywords: item.keywords ? item.keywords.split(',').map((k: string) => k.trim()) : [],
              images: item.image ? (Array.isArray(item.image) ? item.image : [item.image]) : [],
              pricing: pricing,
              variants: null, // JSON-LD'de variant bilgisi genelde yok
              specifications: null, // JSON-LD'de spec bilgisi genelde yok
              category: item.category || null,
              vendor: item.brand?.name || null
            };
          }
        }
      } catch (parseError) {
        // Continue to next script tag
        continue;
      }
    }
    
    return { title: '', description: '', keywords: [], images: [] };
  } catch (error) {
    console.error('Error extracting JSON-LD:', error);
    return { title: '', description: '', keywords: [], images: [] };
  }
}
