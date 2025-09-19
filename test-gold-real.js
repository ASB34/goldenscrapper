// Test Yahoo Finance Gold API
async function testYahooFinanceGold() {
  console.log('🧪 Testing Yahoo Finance Gold API...');
  
  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/GC=F';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Success! Gold data structure:');
    console.log('- Chart available:', !!data.chart);
    console.log('- Results count:', data.chart?.result?.length || 0);
    
    if (data.chart?.result?.[0]) {
      const result = data.chart.result[0];
      const meta = result.meta;
      console.log('- Current price:', meta.regularMarketPrice);
      console.log('- Currency:', meta.currency);
      console.log('- Market time:', new Date(meta.regularMarketTime * 1000));
      console.log('- Exchange name:', meta.exchangeName);
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ Yahoo Finance test failed:', error);
    throw error;
  }
}

// Test alternative: Fixer.io (free tier)
async function testAlternativeAPI() {
  console.log('🧪 Testing alternative gold price sources...');
  
  // Try metals-live.com (free)
  try {
    const response = await fetch('https://metals-api.com/api/latest?access_key=demo&base=XAU&symbols=USD');
    const data = await response.json();
    console.log('✅ Metals API demo response:', data);
  } catch (error) {
    console.error('❌ Metals API failed:', error);
  }
}

module.exports = { testYahooFinanceGold, testAlternativeAPI };
