import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { XauService } from '@/lib/xau-service';

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';
    
    let rates;
    
    if (forceRefresh) {
      console.log('🔄 Force refreshing XAU rates...');
      rates = await XauService.fetchLatestRates(['TRY', 'USD', 'EUR', 'GBP']);
    } else {
      // Get cached rates first
      const cachedRates = await XauService.getCachedRates(60); // 1 hour cache
      
      // If no cached rates or they're old, fetch fresh ones
      rates = cachedRates;
      if (cachedRates.length === 0) {
        console.log('🔄 No cached XAU rates, fetching fresh ones...');
        rates = await XauService.fetchLatestRates(['TRY', 'USD', 'EUR', 'GBP']);
      }
    }
    
    // Normalize rows (support both camelCase and snake_case from the database)
    const normalize = (r: any) => {
      const currency = r.currency ?? r?.currency;
      const rate = r.rate ?? r?.rate_per_gram ?? r?.ratePerGram ?? r?.rate_per_oz ?? r?.ratePerOz;
      const ratePerOz = r.ratePerOz ?? r?.rate_per_oz ?? (rate ? rate * 31.1035 : undefined);
      const fetchedAt = r.fetchedAt ?? r?.fetched_at ?? r?.fetchedAt;
      const source = r.source ?? r?.source;

      return {
        currency,
        rate: typeof rate === 'string' ? parseFloat(rate) : rate,
        ratePerOz: typeof ratePerOz === 'string' ? parseFloat(ratePerOz) : ratePerOz,
        fetchedAt,
        source
      };
    };

    const formattedRates = rates.map((raw: any) => {
      const rate = normalize(raw);
      const safeRate = typeof rate.rate === 'number' ? rate.rate : 0;
      const safeRatePerOz = typeof rate.ratePerOz === 'number' ? rate.ratePerOz : (safeRate * 31.1035) || 0;

      return {
        currency: rate.currency,
        rate: safeRate,
        ratePerOz: safeRatePerOz,
        formatted: `1g Gold = ${safeRate.toFixed(2)} ${rate.currency ?? ''}`,
        formattedOz: `1oz Gold = ${safeRatePerOz.toFixed(2)} ${rate.currency ?? ''}`,
        fetchedAt: rate.fetchedAt,
        source: rate.source
      };
    });
    
    return NextResponse.json({
      success: true,
      rates: formattedRates,
      lastUpdate: rates[0]?.fetchedAt || null,
      totalRates: rates.length
    });
    
  } catch (error: any) {
    console.error('❌ Error in XAU rates API:', error);
    return NextResponse.json({
      error: 'Failed to fetch XAU rates',
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { currencies } = await request.json();
    
    // Fetch fresh rates for specified currencies
    const targetCurrencies = currencies || ['TRY', 'USD', 'EUR', 'GBP'];
    const rates = await XauService.fetchLatestRates(targetCurrencies);
    
    return NextResponse.json({
      success: true,
      message: `Updated XAU rates for ${targetCurrencies.join(', ')}`,
      rates: rates.map(rate => ({
        currency: rate.currency,
        rate: rate.rate,
        ratePerOz: rate.ratePerOz,
        fetchedAt: rate.fetchedAt
      }))
    });
    
  } catch (error: any) {
    console.error('❌ Error updating XAU rates:', error);
    return NextResponse.json({
      error: 'Failed to update XAU rates',
      details: error.message
    }, { status: 500 });
  }
}
