/* Inserta el tipo_usuario PERSONAL_SENA (id 4) si falta. Idempotente. */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { Client } = require('pg');

(async () => {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME,
    password: String(process.env.DB_PASSWORD || ''),
    database: process.env.DB_NAME,
  });
  await client.connect();
  await client.query(
    `INSERT INTO tipo_usuario (id_tipo_usr, tipo_usr)
     OVERRIDING SYSTEM VALUE
     VALUES (4, 'PERSONAL_SENA')
     ON CONFLICT (id_tipo_usr) DO NOTHING`,
  );
  await client.query(
    `SELECT setval(pg_get_serial_sequence('tipo_usuario', 'id_tipo_usr'),
                   (SELECT COALESCE(MAX(id_tipo_usr), 1) FROM tipo_usuario))`,
  );
  const r = await client.query('SELECT id_tipo_usr, tipo_usr FROM tipo_usuario ORDER BY id_tipo_usr');
  console.log('tipo_usuario:', JSON.stringify(r.rows));
  await client.end();
})().catch((e) => { console.error('SEED_ERROR', e.message); process.exit(1); });
