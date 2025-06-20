import connection from "./config.js";

connection.connect((err) => {

    if (err) {
        console.log("Error de conextión");
        return
    }

    console.log("Conexión exitosa")

    let query = "SELECT * FROM db_discos.discos"

    connection.query(query, (err, rows) => {
        if (err) throw err

        console.log(rows)

        connection.end();
    })


})