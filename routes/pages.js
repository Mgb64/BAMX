// Importar el módulo express
const express = require('express');
// Crear una instancia de Router de express
const router = express.Router();

// Ruta para la página principal ('/')
router.get('/', (req, res) => {
  // Verificar si hay un usuario autenticado
  if (req.user) {
    // Renderizar la vista 'index.ejs' pasando el nombre del usuario autenticado
    res.render('dashboard.ejs', { name: req.user.name });
  } else {
    // Manejar el caso donde no hay un usuario autenticado
    // Opción 1: Redirigir a la página de login
    res.redirect('/login');

    // Opción 2: Renderizar la vista con un nombre por defecto o sin nombre
    // res.render('index.ejs', { name: 'Guest' });
  }
});

// Ruta para la página de registro ('/register')
router.get('/register', (req, res) => {
  // Renderizar la vista 'register.ejs'
  res.render('register.ejs');
});

// Ruta para la página de login ('/login')
router.get('/login', (req, res) => {
  // Renderizar la vista 'login.ejs'
  res.render('login.ejs');
});

// Exportar el router para usarlo en otros módulos
module.exports = router;
