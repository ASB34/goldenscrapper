-- Add Shopify API columns to user_settings table
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS shopify_store_url TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS shopify_api_key TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS shopify_api_secret TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS shopify_access_token TEXT;

-- Update schema documentation
COMMENT ON COLUMN user_settings.shopify_store_url IS 'Shopify store domain (e.g., mystore.myshopify.com)';
COMMENT ON COLUMN user_settings.shopify_api_key IS 'Shopify API key for authentication';
COMMENT ON COLUMN user_settings.shopify_api_secret IS 'Shopify API secret for authentication';
COMMENT ON COLUMN user_settings.shopify_access_token IS 'Shopify access token for API calls';