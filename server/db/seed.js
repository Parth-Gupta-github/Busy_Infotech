const bcrypt = require('bcryptjs');
const db = require('../src/db');

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // 1. Hash passwords
    const managerPassword = await bcrypt.hash('manager123', 10);
    const waiterPassword = await bcrypt.hash('waiter123', 10);

    // 2. Insert Users (1 Manager, 2 Waiters)
    console.log('Inserting default users...');
    const userRes = await db.query(`
      INSERT INTO users (email, password, name, role)
      VALUES 
        ('manager@restaurant.com', $1, 'Sarah Manager', 'MANAGER'),
        ('waiter1@restaurant.com', $2, 'Alice Smith', 'WAITER'),
        ('waiter2@restaurant.com', $3, 'Bob Jones', 'WAITER')
      ON CONFLICT (email) DO UPDATE 
      SET password = EXCLUDED.password, name = EXCLUDED.name, role = EXCLUDED.role
      RETURNING id, email, role, name;
    `, [managerPassword, waiterPassword, waiterPassword]);

    console.log(`✅ ${userRes.rowCount} users created/updated.`);

    // 3. Insert Initial Menu Items
    console.log('Inserting default menu items...');
    const menuItems = [
      ['Margherita Pizza', 12.99, true],
      ['Pepperoni Pizza', 14.99, true],
      ['Classic Cheeseburger', 10.50, true],
      ['Veggies Burger', 9.50, true],
      ['Penne Arrabbiata', 11.00, true],
      ['Grilled Salmon', 18.50, true],
      ['Caesar Salad', 8.50, true],
      ['Garlic Bread', 4.99, true],
      ['Tiramisu', 6.50, true],
      ['Espresso', 3.00, true],
      ['Fresh Orange Juice', 4.00, true],
      ['Special Chef Steak', 24.99, false] // Unavailable item demo
    ];

    for (const [name, price, available] of menuItems) {
      await db.query(`
        INSERT INTO menu_items (name, price, available)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING;
      `, [name, price, available]);
    }

    console.log('✅ Default menu items seeded successfully.');
    console.log('✨ Seeding complete!');
    console.log('\nDefault credentials:');
    console.log('  Manager: manager@restaurant.com / manager123');
    console.log('  Waiter 1: waiter1@restaurant.com / waiter123');
    console.log('  Waiter 2: waiter2@restaurant.com / waiter123\n');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await db.pool.end();
  }
}

seed();
