const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'secureAdmin123!';
  const hash = await bcrypt.hash(password, 10);
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\nSQL INSERT:');
  console.log(`INSERT INTO users (email, username, password_hash, is_admin) VALUES ('admin@goldencrafters.com', 'admin', '${hash}', TRUE) ON CONFLICT (email) DO NOTHING;`);
}

generateHash().catch(console.error);
