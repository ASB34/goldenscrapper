-- ================================
-- GOLDEN UPLOAD - POSTGRESQL SCHEMA
-- ================================

-- Create enum types
CREATE TYPE publishing_status AS ENUM ('pending', 'success', 'error');
CREATE TYPE operation_type AS ENUM ('import', 'ai_rewrite', 'publish', 'update', 'delete');

-- ================================
-- PRODUCTS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    etsy_id TEXT UNIQUE,
    etsy_listing_id TEXT UNIQUE,
    original_title TEXT NOT NULL,
    original_description TEXT,
    original_keywords JSONB DEFAULT '[]'::jsonb,
    original_images JSONB DEFAULT '[]'::jsonb,
    original_videos JSONB DEFAULT '[]'::jsonb,
    
    -- Enhanced product data
    pricing JSONB DEFAULT '{}'::jsonb,
    specifications JSONB DEFAULT '{}'::jsonb,
    variants JSONB DEFAULT '[]'::jsonb,
    category TEXT,
    vendor TEXT,
    sku TEXT,
    source_url TEXT,
    
    -- XAU/Gold pricing
    xau_pricing JSONB DEFAULT '{}'::jsonb,
    last_xau_update TIMESTAMPTZ,
    
    -- AI content
    ai_rewritten_content JSONB DEFAULT '{}'::jsonb,
    
    -- Status
    is_processed BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT FALSE,
    published_to JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS products_user_id_idx ON products(user_id);
CREATE INDEX IF NOT EXISTS products_etsy_id_idx ON products(etsy_id);
CREATE INDEX IF NOT EXISTS products_etsy_listing_id_idx ON products(etsy_listing_id);
CREATE INDEX IF NOT EXISTS products_source_url_idx ON products(source_url);
CREATE INDEX IF NOT EXISTS products_created_at_idx ON products(created_at DESC);

-- ================================
-- PUBLISHING LOGS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS publishing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    operation operation_type NOT NULL,
    status publishing_status NOT NULL DEFAULT 'pending',
    details JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS publishing_logs_user_id_idx ON publishing_logs(user_id);
CREATE INDEX IF NOT EXISTS publishing_logs_product_id_idx ON publishing_logs(product_id);
CREATE INDEX IF NOT EXISTS publishing_logs_created_at_idx ON publishing_logs(created_at DESC);

-- ================================
-- USER SETTINGS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    
    -- API Keys (stored encrypted)
    etsy_api_key TEXT,
    shopify_api_key TEXT,
    shopify_api_secret TEXT,
    shopify_webhook_secret TEXT,
    shopify_store_url TEXT,
    prestashop_api_key TEXT,
    prestashop_store_url TEXT,
    openai_api_key TEXT,
    zai_api_key TEXT,
    metals_api_key TEXT,
    
    -- Configuration
    markup_percentage NUMERIC(5,2) DEFAULT 50.00,
    default_language TEXT DEFAULT 'tr',
    ai_provider TEXT DEFAULT 'openai',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS user_settings_user_id_idx ON user_settings(user_id);

-- ================================
-- XAU RATES TABLE
-- ================================
CREATE TABLE IF NOT EXISTS xau_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency TEXT NOT NULL,
    rate NUMERIC(10,2) NOT NULL,
    rate_per_oz NUMERIC(10,2) NOT NULL,
    source TEXT DEFAULT 'metals-api',
    is_active BOOLEAN DEFAULT TRUE,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS xau_rates_currency_idx ON xau_rates(currency);
CREATE INDEX IF NOT EXISTS xau_rates_fetched_at_idx ON xau_rates(fetched_at DESC);

-- ================================
-- USERS TABLE (for authentication)
-- ================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    username TEXT UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);

-- ================================
-- GRANT PERMISSIONS
-- ================================
-- Note: If using a non-root user, uncomment and adjust as needed

-- GRANT USAGE ON SCHEMA public TO postgres;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- ================================
-- DEFAULT DATA INSERTION
-- ================================

-- Insert default admin user (password: admin123 - SHA256 hashed)
INSERT INTO users (email, username, password_hash, is_admin) 
VALUES (
    'admin@goldenupload.local', 
    'admin', 
    '$2b$10$YourHashedPasswordHere',  -- This should be replaced with actual hash
    TRUE
)
ON CONFLICT (email) DO NOTHING;

-- Insert sample XAU rates for major currencies
INSERT INTO xau_rates (currency, rate, rate_per_oz, is_active) 
VALUES 
    ('USD', 2000.00, 62.21, TRUE),
    ('EUR', 1850.00, 59.38, TRUE),
    ('GBP', 1600.00, 51.38, TRUE),
    ('TRY', 65000.00, 2086.20, TRUE)
ON CONFLICT DO NOTHING;

-- ================================
-- COMPLETION MESSAGE
-- ================================
-- Database initialization complete!
