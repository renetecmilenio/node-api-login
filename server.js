import express, { json } from "express";
import connection from "./config.js";
import dotenv from "dotenv";
import bcrypt from "bcrypt"; // Para encriptar las contraseñas
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import session from "express-session"; // Importamos express-session

const app = express();
app.disable("x-powered-by");

dotenv.config();

app.use(json());
app.use(express.urlencoded({ extended: true }));

// Configuración de express-session
app.use(session({
    secret: 'tu-secreto', // Cambia esto por una cadena aleatoria y secreta
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Para desarrollo local puedes poner `secure: false`
}));

const __dirname = dirname(fileURLToPath(import.meta.url));

// Función de middleware para verificar si el usuario está autenticado
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.isAuthenticated) {
        return next();
    } else {
        return res.status(403).send("Acceso denegado. Debes iniciar sesión.");
    }
};

// Ruta para verificar si el usuario está autenticado
app.get("/check-auth", (req, res) => {
    if (req.session && req.session.isAuthenticated) {
        res.status(200).send("Usuario autenticado");
    } else {
        res.status(403).send("Acceso denegado");
    }
});


// Ruta para cerrar sesión
app.post("/logout", (req, res) => {
    // Destruir la sesión
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send("Error al cerrar sesión");
        }
        // Redirigir al login
        res.redirect("/login");
    });
});


// Páginas estáticas
app.get("/admin", isAuthenticated, (req, res) => {
    res.sendFile(join(__dirname, "public", "administrador.html"));
});

app.get("/listaDiscos", (req, res) => {
    res.sendFile(join(__dirname, "public", "listaDiscos.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(join(__dirname, "public", "login.html"));
});

app.get("/register", (req, res) => {
    res.sendFile(join(__dirname, "public", "register.html"));
});

//ruta protegida o puede usarse la redireccionj al login
app.get("/welcome", isAuthenticated, (req, res) => {
    res.sendFile(join(__dirname, "public", "welcome.html"));
});

// Ruta de login
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    // Buscar al usuario en la base de datos
    connection.query("SELECT * FROM usuarios WHERE username = ?", [username], (err, results) => {
        if (err) return res.status(500).send("Error en el servidor");
        if (results.length === 0) return res.status(401).send("Usuario no encontrado");

        const user = results[0];

        // Verificar si la contraseña coincide
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) return res.status(500).send("Error al verificar la contraseña");
            if (!isMatch) return res.status(401).send("Contraseña incorrecta");

            // Aquí se marca la sesión como autenticada
            req.session.isAuthenticated = true; // Ahora debería funcionar correctamente
            req.session.username = user.username; // Puedes guardar el nombre de usuario u otra información

            return res.redirect("/welcome");
        });
    });
});

// Ruta de login sin bcrypt
// app.post("/login", (req, res) => {
//     const { username, password } = req.body;

//     // Buscar al usuario en la base de datos
//     connection.query("SELECT * FROM usuarios WHERE username = ?", [username], (err, results) => {
//         if (err) return res.status(500).send("Error en el servidor");
//         if (results.length === 0) return res.status(401).send("Usuario no encontrado");

//         const user = results[0];

//         // Verificar si la contraseña coincide (comparación de texto plano)
//         if (password !== user.password) {
//             return res.status(401).send("Contraseña incorrecta");
//         }

//         // Aquí se marca la sesión como autenticada
//         req.session.isAuthenticated = true; // Ahora debería funcionar correctamente
//         req.session.username = user.username; // Puedes guardar el nombre de usuario u otra información

//         return res.redirect("/welcome");
//     });
// });




// Ruta de registro
app.post("/register", (req, res) => {
    const { username, password, email } = req.body;

    // Verificar que los campos no estén vacíos
    if (!username || !password) {
        return res.status(400).send("Nombre de usuario y contraseña son obligatorios");
    }

    // Encriptar la contraseña
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) return res.status(500).send("Error al encriptar la contraseña");

        // Guardar el nuevo usuario en la base de datos
        const query = "INSERT INTO usuarios (username, password, email) VALUES (?, ?, ?)";
        connection.query(query, [username, hashedPassword, email], (err, results) => {
            if (err) return res.status(500).send("Error en el servidor");
            return res.redirect("/login");
        });
    });
});


// Ruta de registro sin bcrypt
// app.post("/register", (req, res) => {
//     const { username, password, email } = req.body;

//     // Verificar que los campos no estén vacíos
//     if (!username || !password) {
//         return res.status(400).send("Nombre de usuario y contraseña son obligatorios");
//     }

//     // Guardar el nuevo usuario en la base de datos (sin encriptar la contraseña)
//     const query = "INSERT INTO usuarios (username, password, email) VALUES (?, ?, ?)";
//     connection.query(query, [username, password, email], (err, results) => {
//         if (err) return res.status(500).send("Error en el servidor");

//         return res.redirect("/login");
//     });
// });



// Rutas de discos (sin cambios)
app.get("/discos", (_, res) => {
    let query = "SELECT * FROM db_discos.discos";
    connection.query(query, (err, rows) => {
        if (err) return res.status(500).send("Error en el servidor");
        res.json(rows);
    });
});

app.get("/discos/:id", (req, res) => {
    const query = "SELECT id, nombre, Artista, fecha_pub, Discografica,Precio FROM discos WHERE id = ?";
    connection.query(query, [req.params.id], (err, rows) => {
        if (err) return res.status(500).send("Error en el servidor");
        if (rows.length === 0) return res.status(404).send("Disco no encontrado");
        res.json(rows[0]);
    });
});

// Crear un nuevo disco
app.post("/discos", (req, res) => {
    const { nombre, Artista, fecha_pub, Discografica, Precio } = req.body;
    console.log(req.body);

    if (!nombre || !Artista || !fecha_pub || !Discografica || !Precio) return res.status(400).send("Faltan campos obligatorios");

    connection.query("INSERT INTO discos (nombre, Artista, fecha_pub, Discografica, Precio) VALUES (?, ?, ?, ?, ?)",
        [nombre, Artista, fecha_pub, Discografica, Precio],
        (err, results) => {
            if (err) return res.status(500).send("Error en el servidor");
            res.status(201).json({ id: results.insertId, message: "Disco creado" });
        });
});

// Actualizar un disco
app.put("/discos/:id", (req, res) => {
    const { nombre, Artista, fecha_pub, Discografica, Precio } = req.body;

    if (!nombre || !Artista || !fecha_pub || !Discografica || !Precio) return res.status(400).send("Faltan campos obligatorios");

    const query = "UPDATE discos SET nombre = ?, Artista = ?, fecha_pub = ?, Discografica = ?, Precio = ? WHERE id = ? ";

    connection.query(query, [nombre, Artista, fecha_pub, Discografica, Precio, req.params.id], (err, rows) => {
        if (err) return res.status(500).send("Error en el servidor");
        if (rows.affectedRows === 0) return res.status(404).send("Disco no actualizado");

        res.json({ message: "Disco actualizado" });
    });
});

// Actualización parcial
app.patch("/discos/:id", (req, res) => {
    const fields = req.body;
    console.log(fields);

    connection.query(`UPDATE discos SET ${Object.keys(fields).map(key => `${key} = ?`).join(", ")} WHERE id = ?`,
        [...Object.values(fields), req.params.id],
        (err, results) => {
            if (err) return res.status(500).send("Error en el servidor");
            if (results.affectedRows === 0) return res.status(404).send("Disco no encontrado");

            res.json({ id: results.id, message: "Disco actualizado parcialmente" });
        });
});

// Eliminar un disco
app.delete("/discos/:id", (req, res) => {
    const query = "DELETE FROM discos WHERE id = ?";
    connection.query(query, [req.params.id], (err, results) => {
        if (err) return res.status(500).send("Error en el servidor");
        if (results.affectedRows === 0) return res.status(404).send("Disco no encontrado");

        res.json({ message: "Disco eliminado" });
    });
});

// Puerto de escucha
app.listen(process.env.DB_PORT_APP || 3000, () => {
    console.log(`Servidor corriendo en http://localhost:${process.env.DB_PORT_APP || 3000}`);
});
