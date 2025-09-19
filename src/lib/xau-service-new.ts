import { prisma } from './prisma';

// XAU (Gold) rates service using CoinGecko (FREE and RELIABLE)
export class XauService {
  private static readonly COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd,eur,gbp,try&precision=4';
  
  // Backup: Yahoo Finance (can be unreliable)
  private static readonly YAHOO_FINANCE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/GC=F';
  
  // Exchange rates for currency conversion (updated regularly)
  private static readonly EXCHANGE_RATES = {
    'USD': 1.0,      // Base currency
    'EUR': 0.85,     // 1 USD = 0.85 EUR
    'GBP': 0.73,     // 1 USD = 0.73 GBP
    'TRY': 27.5,     // 1 USD = 27.5 TRY
    'JPY': 149.0     // 1 USD = 149 JPY
  };
  
  // Get latest XAU rates for multiple currencies
  static async fetchLatestRates(currencies: string[] = ['TRY', 'USD', 'EUR', 'GBP']) {
    console.log('🥇 Fetching REAL XAU rates from CoinGecko (FREE & RELIABLE)...');
    
    try {
      // Try CoinGecko first (most reliable free API)
      const response = await fetch(this.COINGECKO_API_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📊 CoinGecko PAX Gold response:', data);
      
      if (!data['pax-gold']) {
        throw new Error('No PAX Gold data received from CoinGecko');
      }
      
      const paxGoldPrices = data['pax-gold'];
      const fetchedAt = new Date();
      const savedRates = [];
      
      // PAX Gold is backed by 1 troy ounce of gold per token
      // So PAX Gold price = 1 troy ounce of gold price
      const goldPriceUsdPerOz = paxGoldPrices.usd;
      
      if (!goldPriceUsdPerOz) {
        throw new Error('No USD price found for PAX Gold');
      }
      
      console.log(`📊 Real gold price via PAX Gold: $${goldPriceUsdPerOz} USD per troy ounce`);
      
      // Convert to price per gram (1 troy ounce = 31.1035 grams)
      const goldPriceUsdPerGram = goldPriceUsdPerOz / 31.1035;
      
      // Calculate rates for each currency
      for (const currency of currencies) {
        let goldPricePerGram: number;
        
        // Use direct rates from CoinGecko if available
        const currencyLower = currency.toLowerCase();
        if (paxGoldPrices[currencyLower]) {
          goldPricePerGram = paxGoldPrices[currencyLower] / 31.1035;
          console.log(`✅ Using direct ${currency} rate from CoinGecko`);
        } else {
          // Calculate using exchange rate
          const exchangeRate = this.EXCHANGE_RATES[currency as keyof typeof this.EXCHANGE_RATES] || 1.0;
          goldPricePerGram = goldPriceUsdPerGram * exchangeRate;
          console.log(`✅ Using calculated ${currency} rate via exchange rate`);
        }
        
        const goldPricePerOz = goldPricePerGram * 31.1035;
        
        const savedRate = await (prisma as any).xauRates.create({
          data: {
            currency,
            rate: parseFloat(goldPricePerGram.toFixed(4)),
            ratePerOz: parseFloat(goldPricePerOz.toFixed(4)),
            source: 'coingecko-paxgold',
            fetchedAt,
          }
        });
        
        savedRates.push(savedRate);
        console.log(`✅ XAU/${currency}: ${goldPricePerGram.toFixed(4)} per gram, ${goldPricePerOz.toFixed(4)} per oz`);
      }
      
      return savedRates;
      
    } catch (error) {
      console.error('❌ CoinGecko API failed, trying Yahoo Finance backup...', error);
      return this.fetchFromYahooFinance(currencies);
    }
  }
  
  // Backup method using Yahoo Finance
  private static async fetchFromYahooFinance(currencies: string[]) {
    try {
      console.log('🔄 Trying Yahoo Finance as backup...');
      
      const response = await fetch(this.YAHOO_FINANCE_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Yahoo Finance error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.chart || !data.chart.result || !data.chart.result[0]) {
        throw new Error('No gold price data received from Yahoo Finance');
      }
      
      const result = data.chart.result[0];
      const meta = result.meta;
      const goldPriceUsdPerOz = meta.regularMarketPrice;
      
      if (!goldPriceUsdPerOz) {
        throw new Error('No gold price found in Yahoo Finance response');
      }
      
      console.log(`📊 Yahoo Finance gold price: $${goldPriceUsdPerOz} USD per troy ounce`);
      
      // Convert to USD per gram
      const goldPriceUsdPerGram = goldPriceUsdPerOz / 31.1035;
      const fetchedAt = new Date(meta.regularMarketTime * 1000);
      const savedRates = [];
      
      // Calculate rates for each currency
      for (const currency of currencies) {
        const exchangeRate = this.EXCHANGE_RATES[currency as keyof typeof this.EXCHANGE_RATES] || 1.0;
        const goldPricePerGram = goldPriceUsdPerGram * exchangeRate;
        const goldPricePerOz = goldPricePerGram * 31.1035;
        
        const savedRate = await (prisma as any).xauRates.create({
          data: {
            currency,
            rate: parseFloat(goldPricePerGram.toFixed(4)),
            ratePerOz: parseFloat(goldPricePerOz.toFixed(4)),
            source: 'yahoo-finance-backup',
            fetchedAt,
          }
        });
        
        savedRates.push(savedRate);
        console.log(`✅ XAU/${currency}: ${goldPricePerGram.toFixed(4)} per gram, ${goldPricePerOz.toFixed(4)} per oz`);
      }
      
      return savedRates;
      
    } catch (error) {
      console.error('❌ Error fetching XAU rates from Yahoo Finance backup:', error);
      
      // Don't use fallback - throw the error so we know what's wrong
      throw new Error(`Failed to fetch real XAU rates from all sources: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Get cached rates from database
  static async getCachedRates(maxAgeMinutes: number = 60) {
    const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    
    const rates = await (prisma as any).xauRates.findMany({
      where: {
        fetchedAt: { gte: cutoff },
        isActive: true
      },
      orderBy: { fetchedAt: 'desc' },
      distinct: ['currency']
    });
    
    return rates;
  }
  
  // Convert price to XAU
  static convertToXau(price: number, currency: string, xauRate: number): number {
    // XAU rate is currency per gram of gold
    // So: price (currency) / rate (currency per gram) = grams of gold
    return parseFloat((price / xauRate).toFixed(6));
  }
  
  // Convert XAU back to currency
  static convertFromXau(xauAmount: number, currency: string, xauRate: number): number {
    // XAU amount (grams) * rate (currency per gram) = price in currency
    return parseFloat((xauAmount * xauRate).toFixed(2));
  }
  
  // Convert pricing object to XAU
  static async convertPricingToXau(pricing: any, sourceCurrency: string) {
    try {
      // Get latest rate for source currency
      const rates = await this.getCachedRates(30); // 30 minutes cache
      let rate = rates.find((r: any) => r.currency === sourceCurrency);
      
      if (!rate) {
        // Fetch fresh rates if not cached
        const freshRates = await this.fetchLatestRates([sourceCurrency]);
        rate = freshRates.find((r: any) => r.currency === sourceCurrency);
      }
      
      if (!rate) {
        throw new Error(`No XAU rate found for ${sourceCurrency}`);
      }
      
      const xauPricing: any = {
        currency: 'XAU',
        rate: rate.rate,
        convertedAt: new Date().toISOString(),
        original: {
          currency: sourceCurrency,
          ...pricing
        }
      };
      
      // Convert main price
      if (pricing.price) {
        xauPricing.price = this.convertToXau(parseFloat(pricing.price), sourceCurrency, rate.rate);
      }
      
      // Convert compare price
      if (pricing.comparePrice) {
        xauPricing.comparePrice = this.convertToXau(parseFloat(pricing.comparePrice), sourceCurrency, rate.rate);
      }
      
      // Convert min/max prices
      if (pricing.minPrice) {
        xauPricing.minPrice = this.convertToXau(parseFloat(pricing.minPrice), sourceCurrency, rate.rate);
      }
      
      if (pricing.maxPrice) {
        xauPricing.maxPrice = this.convertToXau(parseFloat(pricing.maxPrice), sourceCurrency, rate.rate);
      }
      
      return xauPricing;
      
    } catch (error) {
      console.error('❌ Error converting pricing to XAU:', error);
      throw error; // Don't swallow errors
    }
  }
  
  // Convert variants pricing to XAU
  static async convertVariantsToXau(variants: any[], sourceCurrency: string) {
    try {
      const rates = await this.getCachedRates(30);
      let rate = rates.find((r: any) => r.currency === sourceCurrency);
      
      if (!rate) {
        const freshRates = await this.fetchLatestRates([sourceCurrency]);
        rate = freshRates.find((r: any) => r.currency === sourceCurrency);
      }
      
      if (!rate) {
        throw new Error(`No XAU rate found for ${sourceCurrency}`);
      }
      
      return variants.map(variant => ({
        ...variant,
        options: variant.options?.map((option: any) => ({
          ...option,
          xauPrice: option.price ? this.convertToXau(parseFloat(option.price), sourceCurrency, rate.rate) : null,
          originalPrice: option.price,
          originalCurrency: sourceCurrency
        }))
      }));
      
    } catch (error) {
      console.error('❌ Error converting variants to XAU:', error);
      throw error; // Don't swallow errors
    }
  }
}
