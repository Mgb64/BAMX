// Si el entorno no es 'production', cargar las variables de entorno desde el archivo .env
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const methodOverride = require('method-override');
const mysql = require('mysql');

// Inicializar la configuración de Passport
const initializePassport = require('./passport-config');
initializePassport(
    passport,
    // Función para obtener un usuario por email
    async (email) => {
        return new Promise((resolve, reject) => {
            db.query('SELECT * FROM users WHERE email = ?', [email], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results[0]);
                }
            });
        });
    },
    // Función para obtener un usuario por id
    async (id) => {
        return new Promise((resolve, reject) => {
            db.query('SELECT * FROM users WHERE id = ?', [id], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results[0]);
                }
            });
        });
    }
);

// Configurar el motor de vistas y middlewares
app.set('view-engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));

// Conexión a la base de datos nodejs-login
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});

// Conexión a la base de datos AmazonBooks
const dbAmazonBooks = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE2
});

// Conectar a la base de datos nodejs-login
db.connect((error) => {
    if (error) {
        console.log("Error al conectar a nodejs-login:", error);
    } else {
        console.log("Conectado a la base de datos nodejs-login");
    }
});

// Conectar a la base de datos AmazonBooks
dbAmazonBooks.connect((error) => {
    if (error) {
        console.log("Error al conectar a AmazonBooks:", error);
    } else {
        console.log("Conectado a la base de datos AmazonBooks");
    }
});

// Definir rutas
app.use('/', require('./routes/pages'));
app.use('/register', require('./routes/pages'));
app.use('/login', require('./routes/pages'));

// Ruta para el login
app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true
}));

// Ruta para el registro
app.post('/register', checkNotAuthenticated, async (req, res) => {
    try {
        // Hashear la contraseña del usuario
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const newUser = {
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword
        };
        // Insertar el nuevo usuario en la base de datos
        db.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', 
            [newUser.name, newUser.email, newUser.password],
            (error, results) => {
                if (error) {
                    console.log(error);
                    res.redirect('/register');
                } else {
                    res.redirect('/login');
                }
            });
    } catch {
        res.redirect('/register');
    }
});

// Ruta para el logout
app.delete('/logout', (req, res, next) => {
    req.logOut((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/login');
    });
});

// Nueva ruta para el dashboard
app.get('/dashboard', checkAuthenticated, (req, res) => {
    // Consultas SQL para obtener los libros con peor calificación, mejor calificación y conteo de ratings
    let sqlPeores = `
        SELECT * FROM (
            SELECT DISTINCT \`COL 1\`, \`COL 2\`, \`COL 3\`, \`COL 4\`
            FROM bestseller_books_of_amazon
            ORDER BY \`COL 3\` ASC
        ) AS unique_books
        ORDER BY \`COL 3\` ASC
        LIMIT 10
    `;

    let sqlMejores = `
        SELECT * FROM (
            SELECT DISTINCT \`COL 1\`, \`COL 2\`, \`COL 3\`, \`COL 4\`
            FROM bestseller_books_of_amazon
            ORDER BY \`COL 3\` DESC
        ) AS unique_books
        ORDER BY \`COL 3\` DESC
        LIMIT 10
    `;

    let sqlRatingCount = `
        SELECT \`COL 3\` AS rating, COUNT(DISTINCT \`COL 1\`) AS count
        FROM bestseller_books_of_amazon
        WHERE \`COL 3\` BETWEEN 3.6 AND 4.8
        GROUP BY \`COL 3\`
        ORDER BY \`COL 3\`
    `;

    // Ejecutar las consultas y renderizar la vista del dashboard
    dbAmazonBooks.query(sqlPeores, (err, resultsPeores) => {
        if (err) throw err;

        dbAmazonBooks.query(sqlMejores, (err, resultsMejores) => {
            if (err) throw err;

            dbAmazonBooks.query(sqlRatingCount, (err, resultsRatingCount) => {
                if (err) throw err;

                res.render('dashboard.ejs', { 
                    peores: resultsPeores, 
                    mejores: resultsMejores, 
                    ratingCount: resultsRatingCount
                });
            });
        });
    });
});

// Funciones de autenticación
function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    next();
}

// Escuchar en el puerto 3000
app.listen(3000, () => {
    console.log("Servidor iniciado en el puerto 3000");
});

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static('public'));
