const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Configuración de la conexión a Aiven (REEMPLAZÁ CON TUS DATOS)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});
// 2. Ruta para inicializar la tabla (ejecutar una vez)
app.get('/init-db', async (req, res) => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS votos (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(255) UNIQUE NOT NULL,
                buzo_votado VARCHAR(50) NOT NULL,
                fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        res.send("Tabla creada o ya existía.");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error al crear la tabla.");
    }
});

// 3. Ruta para guardar un voto
app.post('/votar', async (req, res) => {
    const { nombre, buzo_votado } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO votos (nombre, buzo_votado) VALUES ($1, $2) RETURNING *',
            [nombre, buzo_votado]
        );
        res.json({ mensaje: "Voto registrado", voto: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') { // Código de error de Postgres para "Unique constraint violation"
            res.status(400).json({ error: "Este nombre ya registró un voto." });
        } else {
            console.error(err);
            res.status(500).json({ error: "Error interno del servidor." });
        }
    }
});

// 4. Ruta para obtener los resultados
app.get('/resultados', async (req, res) => {
    try {
        // Esta consulta agrupa por modelo y cuenta los votos, ordenándolos de mayor a menor
        const result = await pool.query(`
            SELECT buzo_votado as modelo, COUNT(*) as votos
            FROM votos
            GROUP BY buzo_votado
            ORDER BY votos DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener resultados." });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});