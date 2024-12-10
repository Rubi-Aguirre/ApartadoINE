const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
const port = 3000;

// Configuración de EJS como motor de plantillas
app.use(express.json()); // Para analizar cuerpos de solicitudes JSON
app.set('view engine', 'ejs');  // Usar 'ejs' como motor de plantillas
app.use(bodyParser.urlencoded({ extended: true }));

// Configuración de sesión
app.use(session({
    secret: 'secreto',
    resave: false,
    saveUninitialized: true
}));

// Conexión a MongoDB
mongoose.connect('mongodb://localhost:27017/ine')
  .then(() => console.log("Conectado a MongoDB"))
  .catch(err => console.error("Error de conexión:", err));

// Definir el esquema y modelo de los registros
const RegistroSchema = new mongoose.Schema({
    nombre: String,
    apellidos: String,
    edad: Number,
    curp: String,
    telefono: String,
    estado: String,
    municipio: String,
    fecha: String,
    hora: String
});

const Registro = mongoose.model('Registro', RegistroSchema);

// Modelo para admin
const AdminSchema = new mongoose.Schema({
    username: String,
    password: String
});

const Admin = mongoose.model('Admin', AdminSchema);

// Ruta para autenticar al admin
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (username === 'admin' && password === 'admin') { // Simulación de validación
        req.session.isAdmin = true; // Establece sesión de administrador
        res.status(200).json({ message: 'Autenticado correctamente' });
    } else {
        res.status(401).json({ message: 'Credenciales incorrectas' });
    }
});

// Ruta para mostrar los registros (solo admin)
app.get('/admin', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).send("No autorizado");
    }
    // Si está autenticado, se muestran los registros
    res.render('admin'); // No es necesario incluir la extensión si `view engine` está configurado.

});

// Ruta para cerrar sesión del admin
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Error al cerrar sesión' });
        }
        res.status(200).json({ message: 'Sesión cerrada' });
    });
});

// Ruta para mostrar los registros
app.get('/api/registros', async (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ message: 'No autorizado' });
    }
    try {
        const registros = await Registro.find();
        res.json(registros);
    } catch (error) {
        res.status(500).json({ message: 'Error al cargar los registros', error: error.message });
    }
});

// Ruta para mostrar la vista de edición de un registro
app.get('/editar-registro/:id', async (req, res) => {
    if (!req.session.isAdmin) {
        return res.redirect('/'); // Redirigir si no está autenticado
    }

    const { id } = req.params;

    try {
        const registro = await Registro.findById(id);
        if (!registro) {
            return res.status(404).json({ message: 'Registro no encontrado' });
        }
        res.render('editar-registro', { registro });
    } catch (error) {
        console.error('Error al cargar el registro:', error);
        res.status(500).json({ message: 'Error al cargar el registro', error: error.message });
    }
});

// Ruta para actualizar un registro
app.put('/update/:id', async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'ID no válido' });
    }

    const { nombre, apellidos, edad, curp, telefono, estado, municipio, fecha, hora } = req.body;

    try {
        const registro = await Registro.findByIdAndUpdate(id, {
            nombre, apellidos, edad, curp, telefono, estado, municipio, fecha, hora
        }, { new: true });

        if (!registro) {
            return res.status(404).json({ message: 'Registro no encontrado' });
        }

        res.json({ message: 'Registro actualizado con éxito', registro });
    } catch (error) {
        console.error('Error al actualizar el registro:', error);
        res.status(500).json({ message: 'Error al actualizar el registro', error: error.message });
    }
});

// Ruta para eliminar un registro
app.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'ID no válido' });
    }

    try {
        const registro = await Registro.findByIdAndDelete(id);

        if (!registro) {
            return res.status(404).json({ message: 'Registro no encontrado' });
        }

        res.json({ message: 'Registro eliminado con éxito', registro });
    } catch (error) {
        console.error('Error al eliminar el registro:', error);
        res.status(500).json({ message: 'Error al eliminar el registro', error: error.message });
    }
});

// Ruta para filtrar registros por nombre completo
app.get('/filter', async (req, res) => {
    const { nombreCompleto } = req.query; // Obtén el nombre completo desde los parámetros de consulta

    try {
        const registros = await Registro.find({
            nombreCompleto: { $regex: new RegExp(nombreCompleto, 'i') } // Búsqueda insensible a mayúsculas
        });

        if (registros.length === 0) {
            return res.status(404).json({ message: 'No se encontraron registros' });
        }

        res.json({ registros });
    } catch (error) {
        console.error('Error al filtrar registros:', error);
        res.status(500).json({ message: 'Error al filtrar registros', error: error.message });
    }
});

// Ruta para agregar un nuevo registro
app.post('/add', async (req, res) => {
    const { nombre, apellidos, edad, curp, telefono, estado, municipio, fecha, hora } = req.body;

    console.log('Datos recibidos:', req.body); // Verifica los datos recibidos en el servidor

    // Crear un nuevo registro con los datos enviados
    const nuevoRegistro = new Registro({
        nombre, apellidos, edad, curp, telefono, estado, municipio, fecha, hora
    });

    try {
        // Guardar el nuevo registro en la base de datos
        const registroGuardado = await nuevoRegistro.save();
        console.log('Registro guardado:', registroGuardado);  // Verifica si se guarda correctamente
        res.status(201).json({ message: 'Registro agregado con éxito', registro: registroGuardado });
    } catch (error) {
        console.error('Error al agregar el registro:', error);  // Detalles del error
        res.status(500).json({ message: 'Error al agregar el registro', error: error.message });
    }
});

app.post('/add', async (req, res) => {
    // Obtener los datos del cuerpo de la solicitud
    const { nombre, apellidos, edad, curp, telefono, estado, municipio, fecha, hora } = req.body;

    // Crear una nueva instancia del modelo de Registro con los datos enviados
    const nuevoRegistro = new Registro({
        nombre,
        apellidos,
        edad,
        curp,
        telefono,
        estado,
        municipio,
        fecha,
        hora
    });

    try {
        // Guardar el nuevo registro en la base de datos
        const registroGuardado = await nuevoRegistro.save();

        // Responder al cliente con el registro guardado y un mensaje de éxito
        res.status(201).json({
            message: 'Registro agregado con éxito',
            registro: registroGuardado
        });
    } catch (error) {
        // Si ocurre un error, responder con un mensaje de error
        console.error('Error al agregar el registro:', error);
        res.status(500).json({
            message: 'Error al agregar el registro',
            error: error.message
        });
    }
});

app.get('/admin', (req, res) => {
    if (!req.session.isAdmin) {
        return res.redirect('/login'); // Redirige a login si no está autenticado
    }
    res.render('admin'); // Renderiza el archivo admin.ejs
});

// Ruta para la vista de inicio de sesión
app.get('/login', (req, res) => {
    res.render('login');  // Esto buscará el archivo 'login.ejs'
});

// Ruta para mostrar la vista de inicio
app.get('/', (req, res) => {
    res.render('index');
});
const cors = require('cors');
app.use(cors());
// Servir archivos estáticos (HTML, CSS, JS) desde el directorio 'public'
app.use(express.static('public'));

// Iniciar servidor
app.listen(port, () => {
    console.log(`Servidor funcionando en http://localhost:${3000}`);
});


