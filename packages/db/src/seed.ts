import { pool } from './client';

async function seed() {
  console.log('Starting database seed...');

  try {
    // Add seed data here
    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
