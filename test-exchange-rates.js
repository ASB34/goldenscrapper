// Test Yahoo Finance for both Gold price and USD/TRY exchange rate
async function testExchangeRates() {
  console.log('Testing Yahoo Finance for Gold + Exchange Rates...');
  
  try {
    // 1. Gold price (USD per ounce)
    const goldResponse = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=1d');
    const goldData = await goldResponse.json();
    const goldPrice = goldData.chart.result[0].meta.regularMarketPrice;
    console.log('Gold Price (USD/ounce):', goldPrice);
    
    // 2. USD/TRY exchange rate
    const usdTryResponse = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/USDTRY=X?interval=1d&range=1d');
    const usdTryData = await usdTryResponse.json();
    const usdTryRate = usdTryData.chart.result[0].meta.regularMarketPrice;
    console.log('USD/TRY Rate:', usdTryRate);
    
    // 3. Calculate TRY per ounce
    const goldPriceTryPerOz = goldPrice * usdTryRate;
    console.log('Gold Price (TRY/ounce):', goldPriceTryPerOz);
    
    // 4. Calculate per gram
    const goldPriceUsdPerGram = goldPrice / 31.1035;
    const goldPriceTryPerGram = goldPriceTryPerOz / 31.1035;
    
    console.log('Gold Price (USD/gram):', goldPriceUsdPerGram.toFixed(4));
    console.log('Gold Price (TRY/gram):', goldPriceTryPerGram.toFixed(4));
    
    return {
      goldPriceUsd: goldPrice,
      usdTryRate: usdTryRate,
      goldPriceTry: goldPriceTryPerOz,
      goldPriceUsdPerGram: goldPriceUsdPerGram,
      goldPriceTryPerGram: goldPriceTryPerGram
    };
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testExchangeRates();
