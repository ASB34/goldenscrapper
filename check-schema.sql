-- Supabase'deki gerçek schema'yı kontrol etmek için bu sorguları çalıştırın

-- 1. Tüm tabloları listele
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. products tablosunun column'larını listele
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'products' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. user_settings tablosunun column'larını listele
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. xau_rates tablosunun column'larını listele (varsa)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'xau_rates' 
AND table_schema = 'public'
ORDER BY ordinal_position;