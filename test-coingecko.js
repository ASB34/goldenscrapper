// Test CoinGecko PAX Gold API
async function testCoinGecko() {
  console.log('🧪 Testing CoinGecko PAX Gold API...');
  
  try {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd,eur,gbp,try&precision=4';
    const response = await fetch(url);
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Success! PAX Gold data:', data);
    
    if (data['pax-gold']) {
      const paxGold = data['pax-gold'];
      console.log('- USD per troy ounce:', paxGold.usd);
      console.log('- EUR per troy ounce:', paxGold.eur);
      console.log('- GBP per troy ounce:', paxGold.gbp);
      console.log('- TRY per troy ounce:', paxGold.try);
      
      // Calculate per gram
      console.log('- USD per gram:', (paxGold.usd / 31.1035).toFixed(4));
      console.log('- TRY per gram:', (paxGold.try / 31.1035).toFixed(4));
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ CoinGecko test failed:', error);
    throw error;
  }
}

testCoinGecko();
