// ============================================
// SIMPLE TEST USER SETUP
// Uses existing db.js connection
// ============================================

const bcrypt = require('bcrypt');
const db = require('./db');

async function createTestUsers() {
  try {
    console.log('🔐 Creating test users with password: password123\n');

    // Hash the password
    const password_hash = await bcrypt.hash('password123', 10);
    console.log('✅ Password hashed!\n');

    // Delete old test users
    await db.query(`
      DELETE FROM users 
      WHERE email IN ('student@salford.ac.uk', 'staff@salford.ac.uk', 'admin@salford.ac.uk');
    `);
    console.log('🗑️  Cleaned up old users\n');

    // Insert new users
    const users = [
      { email: 'student@salford.ac.uk', name: 'Test Student', role: 'student' },
      { email: 'staff@salford.ac.uk', name: 'Test Staff', role: 'staff' },
      { email: 'admin@salford.ac.uk', name: 'Test Admin', role: 'admin' }
    ];

    for (const user of users) {
      const result = await db.query(
        `INSERT INTO users (email, password_hash, full_name, role) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, email, role`,
        [user.email, password_hash, user.name, user.role]
      );
      console.log(`✅ Created: ${result.rows[0].email} (${result.rows[0].role})`);
    }

    // Verify
    const check = await db.query('SELECT id, email, role FROM users ORDER BY id');
    console.log('\n📋 Users in database:');
    console.log('═'.repeat(50));
    check.rows.forEach(u => console.log(`${u.id} | ${u.email} | ${u.role}`));
    console.log('═'.repeat(50));

    console.log('\n✅ DONE! You can now login with:');
    console.log('   Email: student@salford.ac.uk');
    console.log('   Password: password123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestUsers();
