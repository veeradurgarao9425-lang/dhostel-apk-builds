import db from './src/config/database.js';

async function setup() {
  try {
    const exists = await db.schema.hasTable('tenant_expenses');
    if (!exists) {
      await db.schema.createTable('tenant_expenses', (table) => {
        table.increments('expense_id').primary();
        table.integer('student_id').notNullable(); // Matches student_id from students table (int)
        table.string('title').notNullable();
        table.decimal('amount', 10, 2).notNullable();
        table.string('category').notNullable();
        table.date('date').notNullable();
        table.string('payment_mode').defaultTo('Cash');
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());
      });
      console.log('Created tenant_expenses table without foreign key constraint');
    } else {
      console.log('tenant_expenses table already exists');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

setup();
