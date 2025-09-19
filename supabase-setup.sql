-- ================================
-- GOLDEN UPLOAD - SUPABASE SCHEMA
-- ================================

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create enum types
CREATE TYPE publishing_status AS ENUM ('pending', 'success', 'error');
CREATE TYPE operation_type AS ENUM ('import', 'ai_rewrite', 'publish', 'update', 'delete');

-- ================================
-- PRODUCTS TABLE
-- ================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    etsy_id TEXT UNIQUE,
    original_title TEXT NOT NULL,
    original_description TEXT NOT NULL,
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

-- ================================
-- PUBLISHING LOGS TABLE
-- ================================
CREATE TABLE publishing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    operation operation_type NOT NULL,
    status publishing_status NOT NULL DEFAULT 'pending',
    details JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- USER SETTINGS TABLE
-- ================================
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    
    -- API Keys (stored encrypted)
    prestashop_api_key TEXT,
    prestashop_store_url TEXT,
    openai_api_key TEXT,
    metals_api_key TEXT,
    
    -- Configuration
    markup_percentage NUMERIC(5,2) DEFAULT 50.00,
    default_language TEXT DEFAULT 'tr',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- XAU RATES TABLE
-- ================================
CREATE TABLE xau_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency TEXT NOT NULL,
    rate NUMERIC(10,2) NOT NULL,
    rate_per_oz NUMERIC(10,2) NOT NULL,
    source TEXT DEFAULT 'metals-api',
    is_active BOOLEAN DEFAULT TRUE,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(currency, fetched_at)
);

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_etsy_id ON products(etsy_id);
CREATE INDEX idx_products_is_published ON products(is_published);
CREATE INDEX idx_products_created_at ON products(created_at DESC);

CREATE INDEX idx_publishing_logs_user_id ON publishing_logs(user_id);
CREATE INDEX idx_publishing_logs_product_id ON publishing_logs(product_id);
CREATE INDEX idx_publishing_logs_status ON publishing_logs(status);
CREATE INDEX idx_publishing_logs_created_at ON publishing_logs(created_at DESC);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

CREATE INDEX idx_xau_rates_currency ON xau_rates(currency);
CREATE INDEX idx_xau_rates_is_active ON xau_rates(is_active);
CREATE INDEX idx_xau_rates_fetched_at ON xau_rates(fetched_at DESC);

-- ================================
-- ROW LEVEL SECURITY POLICIES
-- ================================

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE publishing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE xau_rates ENABLE ROW LEVEL SECURITY;

-- Products policies
CREATE POLICY "Users can view own products" ON products
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own products" ON products
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own products" ON products
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own products" ON products
    FOR DELETE USING (user_id = auth.uid());

-- Publishing logs policies
CREATE POLICY "Users can view own publishing logs" ON publishing_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own publishing logs" ON publishing_logs
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- User settings policies
CREATE POLICY "Users can view own settings" ON user_settings
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own settings" ON user_settings
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own settings" ON user_settings
    FOR UPDATE USING (user_id = auth.uid());

-- XAU rates policies (public read)
CREATE POLICY "XAU rates are publicly readable" ON xau_rates
    FOR SELECT USING (TRUE);

-- Only service role can insert/update XAU rates
CREATE POLICY "Service can manage XAU rates" ON xau_rates
    FOR ALL USING (auth.role() = 'service_role');

-- ================================
-- FUNCTIONS AND TRIGGERS
-- ================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON user_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================
-- SAMPLE DATA (Optional)
-- ================================

-- Insert sample XAU rates
INSERT INTO xau_rates (currency, rate, rate_per_oz, source) VALUES
('TRY', 2850.50, 88650.00, 'metals-api'),
('USD', 85.25, 2650.00, 'metals-api'),
('EUR', 78.90, 2453.00, 'metals-api');

-- ================================
-- SETUP COMPLETE
-- ================================
-- Your Supabase database is now ready for Golden Upload!
-- 
-- Next steps:
-- 1. Update your environment variables with Supabase credentials
-- 2. Update your API routes to use Supabase instead of Prisma
-- 3. Test the connection with your application
-- ================================