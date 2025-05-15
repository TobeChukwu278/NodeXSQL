// Required dependencies
const express = require('express');
const mysql = require('mysql');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt'); // Added bcrypt for password hashing
require('dotenv').config();
const url = require('url');

const PORT = process.env.PORT || 3000;
const app = express();

// Set up the view engine
app.set('view engine', 'ejs');

// Middleware to parse request body
app.use(express.urlencoded({ extended: true }));

// Create DB connection using the connection URL
const dbUrl = process.env.DB_CONNECTION_URL;
const parsedUrl = new URL(dbUrl);

const db = mysql.createConnection({
    host: parsedUrl.hostname,
    port: parsedUrl.port,
    user: parsedUrl.username,
    password: parsedUrl.password,
    database: parsedUrl.pathname.replace('/', '')
});

// Connect to the DB
db.connect((err) => {
    if (err) {
        console.error('❌ Error connecting to the database:', err);
        process.exit(1);
    }
    console.log('✅ Connected to the database');

    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS form (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255),
            email VARCHAR(255) UNIQUE,
            password VARCHAR(255)
        )
    `;

    db.query(createTableQuery, (err, result) => {
        if (err) {
            console.error('❌ Error creating table:', err);
        } else {
            console.log('✅ Table "form" is ready');
        }
    });
});


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
