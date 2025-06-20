import { createConnection } from "mysql2";

import dotenv from "dotenv";

dotenv.config();

const connection = createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '@Tecmilenio2025',
    database: process.env.DB_NAME || 'db_discos',
    port: process.env.DB_PORT_MSQL || 3306
})

export default connection;