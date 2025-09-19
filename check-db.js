require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabase() {
  try {
    console.log('🔍 Checking Supabase connection...');

    // Check products table
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, original_title, original_description')
      .limit(1);

    if (productsError) {
      console.error('❌ Products table error:', productsError);
    } else {
      console.log('✅ Products table exists');
      console.log('📊 Found', products?.length || 0, 'sample products');
    }

    // Check if original_description column exists by trying to select it
    const { data: testData, error: testError } = await supabase
      .from('products')
      .select('original_description')
      .limit(1);

    if (testError) {
      console.error('❌ original_description column error:', testError.message);
    } else {
      console.log('✅ original_description column exists');
    }

  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  }
}

checkDatabase();
