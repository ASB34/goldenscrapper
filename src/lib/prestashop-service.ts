import { prisma } from './prisma';

// PrestaShop XML API Integration for XAU (Gold) Products
export class PrestaShopService {
  private static readonly XML_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product>
    <id_manufacturer>1</id_manufacturer>
    <id_category_default>{categoryId}</id_category_default>
    <new>1</new>
    <id_default_combination>0</id_default_combination>
    <id_default_image></id_default_image>
    <name>
      <language id="1"><![CDATA[{title}]]></language>
      <language id="2"><![CDATA[{title}]]></language>
    </name>
    <description>
      <language id="1"><![CDATA[{description}]]></language>
      <language id="2"><![CDATA[{description}]]></language>
    </description>
    <description_short>
      <language id="1"><![CDATA[{shortDescription}]]></language>
      <language id="2"><![CDATA[{shortDescription}]]></language>
    </description_short>
    <link_rewrite>
      <language id="1">{slug}</language>
      <language id="2">{slug}</language>
    </link_rewrite>
    <meta_title>
      <language id="1"><![CDATA[{title}]]></language>
      <language id="2"><![CDATA[{title}]]></language>
    </meta_title>
    <meta_description>
      <language id="1"><![CDATA[{metaDescription}]]></language>
      <language id="2"><![CDATA[{metaDescription}]]></language>
    </meta_description>
    <quantity>{quantity}</quantity>
    <minimal_quantity>1</minimal_quantity>
    <price>{xauPrice}</price>
    <wholesale_price>{xauWholesalePrice}</wholesale_price>
    <reference>{sku}</reference>
    <supplier_reference>{supplierReference}</supplier_reference>
    <location></location>
    <width>0</width>
    <height>0</height>
    <depth>0</depth>
    <weight>{weight}</weight>
    <out_of_stock>2</out_of_stock>
    <quantity_discount>0</quantity_discount>
    <customizable>0</customizable>
    <uploadable_files>0</uploadable_files>
    <text_fields>0</text_fields>
    <active>1</active>
    <redirect_type>404</redirect_type>
    <available_for_order>1</available_for_order>
    <available_date>0000-00-00</available_date>
    <condition>new</condition>
    <show_price>1</show_price>
    <indexed>1</indexed>
    <visibility>both</visibility>
    <advanced_stock_management>0</advanced_stock_management>
    <date_add>{dateAdd}</date_add>
    <date_upd>{dateUpd}</date_upd>
    <pack_stock_type>3</pack_stock_type>
    <meta_keywords>
      <language id="1"><![CDATA[{keywords}]]></language>
      <language id="2"><![CDATA[{keywords}]]></language>
    </meta_keywords>
  </product>
</prestashop>`;

  // Get PrestaShop API configuration
  static async getApiConfig() {
    const config = await prisma.apiKeys.findFirst();
    if (!config?.prestashopApiKey || !config?.prestashopStoreUrl) {
      throw new Error('PrestaShop API configuration not found');
    }
    return {
      apiKey: config.prestashopApiKey,
      storeUrl: config.prestashopStoreUrl
    };
  }

  // Generate slug from title
  static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  // Format XAU price for PrestaShop (troy ounce format)
  static formatXauPrice(xauPrice: number): string {
    // PrestaShop typically expects up to 6 decimal places for precious metals
    return xauPrice.toFixed(6);
  }

  // Convert product to PrestaShop XML with XAU pricing
  static async createProductXML(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new Error('Product not found');
    }

    if (!(product as any).xauPricing) {
      throw new Error('Product does not have XAU pricing. Please fetch XAU rates first.');
    }

    const xauPricing = (product as any).xauPricing;
    const pricing = product.pricing as any;
    const specifications = product.specifications as any;

    // Extract product details
    const title = product.originalTitle;
    const description = product.originalDescription;
    const shortDescription = description.length > 400 
      ? description.substring(0, 400) + '...' 
      : description;
    
    const slug = this.generateSlug(title);
    const weight = specifications?.weight || 0;
    const keywords = Array.isArray(product.originalKeywords) 
      ? product.originalKeywords.join(', ') 
      : '';

    // XAU pricing (troy ounce)
    const xauPrice = this.formatXauPrice(xauPricing.price);
    const xauWholesalePrice = xauPricing.comparePrice 
      ? this.formatXauPrice(xauPricing.comparePrice * 0.8) // 20% wholesale discount
      : xauPrice;

    // Generate XML
    const xml = this.XML_TEMPLATE
      .replace('{categoryId}', '2') // Default jewelry category
      .replace(/{title}/g, title)
      .replace(/{description}/g, description)
      .replace(/{shortDescription}/g, shortDescription)
      .replace('{slug}', slug)
      .replace('{metaDescription}', shortDescription)
      .replace('{quantity}', '100') // Default stock
      .replace('{xauPrice}', xauPrice)
      .replace('{xauWholesalePrice}', xauWholesalePrice)
      .replace('{sku}', product.sku || `ETY-${product.etsyId}`)
      .replace('{supplierReference}', product.etsyId || '')
      .replace('{weight}', weight.toString())
      .replace('{dateAdd}', new Date().toISOString().split('T')[0])
      .replace('{dateUpd}', new Date().toISOString().split('T')[0])
      .replace('{keywords}', keywords);

    return xml;
  }

  // Send product to PrestaShop with XAU pricing
  static async sendToPrestaShop(productId: string) {
    try {
      const config = await this.getApiConfig();
      const xml = await this.createProductXML(productId);

      console.log('🏪 Sending product to PrestaShop with XAU pricing...');
      console.log('📊 XML Preview:', xml.substring(0, 500) + '...');

      const response = await fetch(`${config.storeUrl}/api/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(config.apiKey + ':').toString('base64')}`,
          'Content-Type': 'application/xml'
        },
        body: xml
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PrestaShop API error: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const responseXml = await response.text();
      console.log('✅ Product sent to PrestaShop successfully');
      console.log('📄 Response:', responseXml.substring(0, 300) + '...');

      // Extract product ID from response
      const productIdMatch = responseXml.match(/<id>(\d+)<\/id>/);
      const prestashopProductId = productIdMatch ? productIdMatch[1] : null;

      // Update product with PrestaShop publish info
      if (prestashopProductId) {
        await prisma.product.update({
          where: { id: productId },
          data: {
            isPublished: true,
            publishedTo: {
              prestashop: {
                published: true,
                productId: prestashopProductId,
                url: `${config.storeUrl}/product/${prestashopProductId}`,
                adminUrl: `${config.storeUrl}/admin/products/${prestashopProductId}`,
                publishedAt: new Date().toISOString(),
                currency: 'XAU',
                pricing: 'troy-ounce'
              }
            }
          }
        });
      }

      return {
        success: true,
        prestashopProductId,
        message: 'Product published to PrestaShop with XAU pricing',
        xauPrice: null // We'll extract this from the product
      };

    } catch (error) {
      console.error('❌ PrestaShop integration error:', error);
      throw error;
    }
  }

  // Create product variants for PrestaShop
  static async createProductVariants(productId: string, prestashopProductId: string) {
    // This would handle creating product combinations/variants
    // Each variant would have its own XAU pricing
    console.log('🔄 Creating product variants for PrestaShop...');
    // Implementation would depend on PrestaShop variant structure
  }

  // Get XAU pricing summary for a product
  static async getXauPricingSummary(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product || !(product as any)?.xauPricing) {
      return null;
    }

    const xauPricing = (product as any).xauPricing;
    const pricing = product.pricing as any;

    return {
      productId,
      title: product.originalTitle,
      original: {
        price: pricing?.price,
        currency: pricing?.currency
      },
      xau: {
        price: xauPricing.price,
        comparePrice: xauPricing.comparePrice,
        currency: 'XAU',
        unit: 'troy-ounce',
        rate: xauPricing.rate,
        convertedAt: xauPricing.convertedAt
      },
      prestashop: {
        formatted: this.formatXauPrice(xauPricing.price),
        wholesalePrice: xauPricing.comparePrice 
          ? this.formatXauPrice(xauPricing.comparePrice * 0.8)
          : this.formatXauPrice(xauPricing.price)
      }
    };
  }
}
