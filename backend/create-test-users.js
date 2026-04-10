// ============================================
// CREATE TEST USERS SCRIPT
// Run this ONCE to create test users
// ============================================

const bcrypt = require('bcrypt');
const db = require('./db');

async function createTestUsers() {
  try {
    console.log('🔐 Creating test users...\n');

    // Hash the password "password123"
    const saltRounds = 10;
    const password_hash = await bcrypt.hash('password123', saltRounds);

    const users = [
      {
        email: 'student@salford.ac.uk',
        full_name: 'Test Student',
        role: 'student'
      },
      {
        email: 'staff@salford.ac.uk',
        full_name: 'Test Staff',
        role: 'staff'
      },
      {
        email: 'admin@salford.ac.uk',
        full_name: 'Test Admin',
        role: 'admin'
      }
    ];

    for (const user of users) {
      try {
        const result = await db.query(
          `INSERT INTO users (email, password_hash, full_name, role) 
           VALUES ($1, $2, $3, $4) 
           ON CONFLICT (email) DO UPDATE 
           SET password_hash = $2, full_name = $3, role = $4
           RETURNING id, email, role`,
          [user.email, password_hash, user.full_name, user.role]
        );

        console.log(`✅ Created/Updated: ${result.rows[0].email} (${result.rows[0].role})`);
      } catch (err) {
        console.error(`❌ Error creating ${user.email}:`, err.message);
      }
    }

    console.log('\n✅ Test users created successfully!');
    console.log('\n📋 Login credentials:');
    console.log('Email: student@salford.ac.uk | Password: password123');
    console.log('Email: staff@salford.ac.uk   | Password: password123');
    console.log('Email: admin@salford.ac.uk   | Password: password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestUsers();
