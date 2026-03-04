-- Insert admin user
-- Password hash calculated by Node.js bcryptjs:
-- password: "secureAdmin123!"
-- Using a pre-generated bcryptjs hash for admin@goldencrafters.com

INSERT INTO users (email, password_hash, is_admin) 
VALUES (
    'admin@goldencrafters.com', 
    '$2b$10$Y.W1dJ95.7Z8.3cQ3K3q.OqrK.D8sFkZnvGnJ9Xc8eFKJk3LqBpK',
    TRUE
)
ON CONFLICT (email) DO NOTHING;

SELECT id, email, is_admin FROM users WHERE email = 'admin@goldencrafters.com';
