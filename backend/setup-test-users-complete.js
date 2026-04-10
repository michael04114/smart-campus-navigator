// ============================================
// COMPREHENSIVE TEST USER SETUP
// This script will create test users with proper password hashing
// ============================================

require('dotenv').config();
const bcrypt = require('bcrypt');
const { Client } = require('pg');

// Database connection
const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/smart_campus_navigator'
});

async function setupTestUsers() {
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database!\n');

    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ Users table does not exist!');
      console.log('📝 Creating users table...\n');

      await client.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'student',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP,
          
          CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
          CONSTRAINT valid_role CHECK (role IN ('student', 'staff', 'admin'))
        );
      `);

      console.log('✅ Users table created!\n');
    } else {
      console.log('✅ Users table exists!\n');
    }

    // Delete existing test users
    console.log('🗑️  Deleting any existing test users...');
    await client.query(`
      DELETE FROM users 
      WHERE email IN ('student@salford.ac.uk', 'staff@salford.ac.uk', 'admin@salford.ac.uk');
    `);
    console.log('✅ Cleaned up old test users\n');

    // Hash password
    console.log('🔐 Hashing password "password123"...');
    const saltRounds = 10;
    const password_hash = await bcrypt.hash('password123', saltRounds);
    console.log('✅ Password hashed!\n');

    // Insert test users
    const testUsers = [
      { email: 'student@salford.ac.uk', name: 'Test Student', role: 'student' },
      { email: 'staff@salford.ac.uk', name: 'Test Staff', role: 'staff' },
      { email: 'admin@salford.ac.uk', name: 'Test Admin', role: 'admin' }
    ];

    console.log('👥 Creating test users...\n');

    for (const user of testUsers) {
      const result = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, email, full_name, role, created_at`,
        [user.email, password_hash, user.name, user.role]
      );

      const created = result.rows[0];
      console.log(`✅ Created: ${created.email}`);
      console.log(`   ID: ${created.id}`);
      console.log(`   Name: ${created.full_name}`);
      console.log(`   Role: ${created.role}`);
      console.log(`   Created: ${created.created_at}\n`);
    }

    // Verify users were created
    console.log('🔍 Verifying users in database...\n');
    const verification = await client.query(`
      SELECT id, email, full_name, role, is_active 
      FROM users 
      ORDER BY id;
    `);

    console.log('📋 Current users in database:');
    console.log('═'.repeat(70));
    verification.rows.forEach(user => {
      console.log(`ID: ${user.id} | ${user.email} | ${user.full_name} | ${user.role} | Active: ${user.is_active}`);
    });
    console.log('═'.repeat(70));

    console.log('\n✅ SETUP COMPLETE!\n');
    console.log('📋 Test Login Credentials:');
    console.log('━'.repeat(70));
    console.log('Email: student@salford.ac.uk  | Password: password123 | Role: student');
    console.log('Email: staff@salford.ac.uk    | Password: password123 | Role: staff');
    console.log('Email: admin@salford.ac.uk    | Password: password123 | Role: admin');
    console.log('━'.repeat(70));
    console.log('\n🚀 You can now login at http://localhost:5173/login\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\n📝 Full error:', error);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the setup
setupTestUsers();
