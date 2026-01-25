import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function checkAdminPassword() {
  console.log('🔍 Checking admin user in database...\n');

  try {
    // Find admin user
    const admin = await prisma.user.findUnique({
      where: { name: 'admin' },
    });

    if (!admin) {
      console.log('❌ Admin user not found in database!');
      console.log('💡 You may need to run: npm run db:seed\n');
      return;
    }

    console.log('✅ Admin user found:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Has Password: ${admin.hashedPassword ? 'Yes' : 'No'}`);
    console.log(`   Hashed Password: ${admin.hashedPassword?.substring(0, 20)}...`);

    // Test password
    if (admin.hashedPassword) {
      console.log('\n🔐 Testing password "admin123"...');
      const isMatch = await bcrypt.compare('admin123', admin.hashedPassword);

      if (isMatch) {
        console.log('✅ Password "admin123" is CORRECT!');
      } else {
        console.log('❌ Password "admin123" does NOT match!');
        console.log('💡 The password in the database is different.');
        console.log('💡 You may need to re-seed the database: npm run db:seed');
      }

      // Test some other common passwords
      console.log('\n🔍 Testing other common passwords...');
      const testPasswords = ['admin', 'password', '123456', 'Admin123'];
      for (const pwd of testPasswords) {
        const match = await bcrypt.compare(pwd, admin.hashedPassword);
        if (match) {
          console.log(`✅ Password "${pwd}" MATCHES!`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminPassword();
