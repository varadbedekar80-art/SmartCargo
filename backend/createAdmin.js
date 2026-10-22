
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  let db;

  try {
    console.log('Create a Smart Cargo administrator account');
    console.log('Connects using the DB_* environment variables.');

    const name = (await ask('Admin name: ')).trim();
    const email = (await ask('Admin email: ')).trim().toLowerCase();
    const password = await ask('Admin password: ');

    if (!name || !email || !password) {
      throw new Error('All fields are required.');
    }

    // Explicitly require Railway connection settings.
    const host = process.env.RAILWAY_DB_HOST;
    const port = Number(process.env.RAILWAY_DB_PORT);
    const user = process.env.RAILWAY_DB_USER;
    const dbPassword = process.env.RAILWAY_DB_PASSWORD;
    const database = process.env.RAILWAY_DB_NAME;

    if (!host || !port || !user || !dbPassword || database !== 'railway') {
      throw new Error(
        'Set RAILWAY_DB_HOST, RAILWAY_DB_PORT, RAILWAY_DB_USER, ' +
        'RAILWAY_DB_PASSWORD and RAILWAY_DB_NAME=railway first.'
      );
    }

    db = await mysql.createConnection({
      host,
      port,
      user,
      password: dbPassword,
      database,
      ssl: { rejectUnauthorized: false },
    });

    const [existing] = await db.execute(
      'SELECT id, role FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      throw new Error(
        `This email already exists with role "${existing[0].role}".`
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.execute(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES (?, ?, ?, 'admin')`,
      [name, email, passwordHash]
    );

    console.log('Admin created successfully in Railway.');
  } catch (error) {
    console.error('Admin creation failed:', error.message);
    process.exitCode = 1;
  } finally {
    if (db) await db.end();
    rl.close();
  }
}

main();
