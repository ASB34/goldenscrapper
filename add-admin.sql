-- Insert admin user with proper credentials
-- Password: secureAdmin123! (using a basic hash format that matches app expectations)
INSERT INTO users (email, username, password_hash, is_admin) 
VALUES (
    'admin@goldencrafters.com', 
    'admin', 
    -- This is a placeholder - app should hash this properly
    '$2b$10$abcdefghijklmnopqrstuvwxyz',
    TRUE
)
ON CONFLICT (email) DO NOTHING;

-- Verify insert
SELECT id, email, username, is_admin FROM users ORDER BY created_at DESC LIMIT 5;
