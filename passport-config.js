// Requerir los módulos necesarios
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

// Función para inicializar Passport
function initialize(passport, getUserByEmail, getUserById) {
  // Función para autenticar al usuario
  const authenticateUser = async (email, password, done) => {
    try {
      // Obtener el usuario por email usando la función proporcionada
      const user = await getUserByEmail(email); // Esperar la promesa de getUserByEmail
      if (!user) {
        return done(null, false, { message: 'No user with that email' });
      }

      // Comparar la contraseña proporcionada con la almacenada en la base de datos
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        return done(null, user); // Autenticación exitosa
      } else {
        return done(null, false, { message: 'Password incorrect' });
      }
    } catch (e) {
      return done(e); // Manejar errores
    }
  }

  // Configurar la estrategia de autenticación local de Passport
  passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser));

  // Serializar el usuario para la sesión
  passport.serializeUser((user, done) => done(null, user.id));

  // Deserializar el usuario de la sesión
  passport.deserializeUser(async (id, done) => {
    try {
      // Obtener el usuario por id usando la función proporcionada
      const user = await getUserById(id); // Esperar la promesa de getUserById
      done(null, user); // Usuario encontrado
    } catch (e) {
      done(e, null); // Manejar errores
    }
  });
}

// Exportar la función de inicialización
module.exports = initialize;
