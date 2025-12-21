const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('Usage: node hash-password.js <password>');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log('Hashed password:', hash);
console.log('\nAdd this to your .env file:');
console.log(`ADMIN_PASSWORD=${hash}`);

