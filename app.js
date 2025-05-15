// Required dependencies
const express = require('express');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt'); // Added bcrypt for password hashing
require('dotenv').config();

const PORT = 3000 || 4000;
const app = express();

// Set up the view engine
app.set('view engine', 'ejs');

// Middleware to parse request body
app.use(express.urlencoded({ extended: true }));

let db;

// Database connection
(async () => {
    try{
        const db = await mysql.createConnection(process.env.DB_CONNECTION_URL);
        console.log('✅ Connected to the database');

        const createTableQuery = `
         CREATE TABLE IF NOT EXISTS form (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255)
      )`;

        await db.execute(createTableQuery);
        console.log('✅ Table "form" is ready')
    } catch (err) {
        console.log('❌ Error connecting to the database:', err);
        process.exit(1);
    }
})();


// Route: Show signup page
app.get('/', (req, res) => {
    res.render('signup');
});

// Route: Handle signup
app.post('/signup', async (req, res) => {
    const data = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password
    };

    // Corrected: Use SQL to check if user exists
    db.query('SELECT * FROM form WHERE email = ?', [data.email], async (err, results) => {
        if (err) return res.status(500).send("Database error");

        if (results.length > 0) {
            return res.status(400).send("User with this email already exists. Choose a different email.");
        } else {
            try {
                // Hash password
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(data.password, saltRounds);

                // Insert user into DB
                db.query('INSERT INTO form (name, email, password) VALUES (?, ?, ?)',
                    [data.name, data.email, hashedPassword],
                    (err, result) => {
                        if (err) {
                            console.log(err);
                            return res.status(500).send("Error saving user");
                        }
                        return res.status(201).send("User registered successfully");
                    }
                );
            } catch (error) {
                console.error(error);
                return res.status(500).send("Server error");
            }
        }
    });
});


app.get('/login', (req, res) => {
    res.render('login');
});


// Route: Handle login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Corrected: SQL to find user by email or name
    db.query('SELECT * FROM form WHERE email = ? OR name = ?', [email, email], async (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database error");
        }

        if (results.length === 0) {
            return res.status(400).send("User not found");
        }

        const user = results[0];

        // Corrected: bcrypt.compare (was mistyped before)
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            // In a real app, you would set up a session or JWT here
            return res.send("Login successful. Welcome " + user.name);
        } else {
            return res.status(400).send("Invalid password");
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}/`);
});
