const bcrypt = require('bcryptjs');
const db = require('../src/db');

async function seed() {
  console.log('🌱 Seeding database with menu items and INR (₹) prices...');

  try {
    // 1. Hash default passwords
    const managerPassword = await bcrypt.hash('manager123', 10);
    const waiterPassword = await bcrypt.hash('waiter123', 10);

    // 2. Insert Users (1 Manager, 2 Waiters) idempotently
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

    console.log(`✅ Default user accounts configured.`);

    // 3. Insert menu items idempotently (ON CONFLICT (name) DO UPDATE)
    console.log('Inserting default menu items...');
    const menuItems = [
      ['Margherita Pizza', 299.00, true],
      ['Pepperoni Pizza', 399.00, true],
      ['Classic Cheeseburger', 249.00, true],
      ['Veggies Burger', 199.00, true],
      ['Penne Arrabbiata Pasta', 279.00, true],
      ['Grilled Salmon Steak', 549.00, true],
      ['Caesar Salad', 189.00, true],
      ['Garlic Cheese Bread font', 149.00, true],
      ['Tiramisu Dessert', 179.00, true],
      ['Espresso Coffee', 99.00, true],
      ['Fresh Orange Juice', 120.00, true],
      ['Special Chef Steak', 699.00, false]
    ];

    for (const [name, price, available] of menuItems) {
      await db.query(`
        INSERT INTO menu_items (name, price, available)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO UPDATE
        SET price = EXCLUDED.price, available = EXCLUDED.available;
      `, [name, price, available]);
    }

    console.log('✅ Default menu items seeded with INR (₹) prices.');
    console.log('✨ Seeding complete!\n');

    console.log('Default developer credentials:');
    console.log('  Manager:  manager@restaurant.com / manager123');
    console.log('  Waiter 1: waiter1@restaurant.com / waiter123');
    console.log('  Waiter 2: waiter2@restaurant.com / waiter123');
    process.exit(0);

  } catch (err) {
    console.error('❌ Error seeding database:', err);
    process.exit(1);
  } finally {
    try {
      if (db.pool) await db.pool.end();
    } catch (e) {
      // Ignore
    }
  }
}

seed();
