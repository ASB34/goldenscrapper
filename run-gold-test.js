require('dotenv').config({ path: '.env.local' });

async function testDirectly() {
  const { testYahooFinanceGold, testAlternativeAPI } = require('./test-gold-real.js');
  
  try {
    await testYahooFinanceGold();
  } catch (error) {
    console.log('Yahoo Finance failed, trying alternatives...');
    await testAlternativeAPI();
  }
}

testDirectly();
