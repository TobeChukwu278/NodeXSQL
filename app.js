// Required dependencies
const express = require('express');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Parse the connection URL using native URL class
const dbUrl = process.env.DB_CONNECTION_URL;
if (!dbUrl) {
  console.error("❌ DB_CONNECTION_URL is not set in .env");
  process.exit(1);
}

const parsedUrl = new URL(dbUrl);

const dbConfig = {
  host: parsedUrl.hostname,
  port: parsedUrl.port,
  user: parsedUrl.username,
  password: parsedUrl.password,
  database: parsedUrl.pathname.slice(1), // remove leading '/'
  // Optional: add ssl if needed (depending on your DB host)
  // ssl: { rejectUnauthorized: true }
};

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

// Wrap async DB setup in an async function
async function startServer() {
  try {
    const db = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to the database');

    // Create table if not exists
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS form (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255)
      )
    `;
    await db.execute(createTableQuery);
    console.log('✅ Table "form" is ready');

    // Signup page
    app.get('/', (req, res) => {
      res.render('signup');
    });

    // Signup handler
    app.post('/signup', async (req, res) => {
      const { name, email, password } = req.body;

      try {
        const [existingUsers] = await db.execute('SELECT * FROM form WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
          return res.status(400).send('User with this email already exists. Choose a different email.');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.execute('INSERT INTO form (name, email, password) VALUES (?, ?, ?)', [
          name,
          email,
          hashedPassword,
        ]);

        return res.status(201).send('User registered successfully');
      } catch (error) {
        console.error(error);
        return res.status(500).send('Server error');
      }
    });

    // Login page
    app.get('/login', (req, res) => {
      res.render('login');
    });

    // Login handler
    app.post('/login', async (req, res) => {
      const { email, password } = req.body;

      try {
        const [users] = await db.execute('SELECT * FROM form WHERE email = ? OR name = ?', [email, email]);
        if (users.length === 0) {
          return res.status(400).send('User not found');
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
          // TODO: Add session or JWT here in real app
          return res.send('Login successful. Welcome ' + user.name);
        } else {
          return res.status(400).send('Invalid password');
        }
      } catch (error) {
        console.error(error);
        return res.status(500).send('Database error');
      }
    });

    // Start listening
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}/`);
    });
  } catch (err) {
    console.error('❌ Error connecting to the database:', err);
    process.exit(1);
  }
}

startServer();
