/* Crea la tabla `visita` (synchronize está apagado en este entorno). Idempotente. */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { Client } = require('pg');

const DDL = `
CREATE TABLE IF NOT EXISTS visita (
  id_visita             SERIAL PRIMARY KEY,
  nombre_visitante      VARCHAR(80)  NOT NULL,
  documento_visitante   VARCHAR(10)  NOT NULL,
  placa                 VARCHAR(10)  NOT NULL,
  tipo_vehiculo         VARCHAR(30),
  a_quien_visita        VARCHAR(80)  NOT NULL,
  motivo                TEXT,
  hora_ingreso          TIMESTAMPTZ  NOT NULL,
  hora_salida           TIMESTAMPTZ,
  estado                VARCHAR(10)  NOT NULL DEFAULT 'ADENTRO',
  expira_en             TIMESTAMPTZ  NOT NULL,
  id_operativo_ingreso  VARCHAR(10)  NOT NULL,
  id_operativo_salida   VARCHAR(10),
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_visita_estado ON visita (estado);
CREATE INDEX IF NOT EXISTS idx_visita_placa ON visita (placa);
CREATE INDEX IF NOT EXISTS idx_visita_documento ON visita (documento_visitante);
`;

(async () => {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME,
    password: String(process.env.DB_PASSWORD || ''),
    database: process.env.DB_NAME,
  });
  await client.connect();
  await client.query(DDL);
  const r = await client.query(`SELECT to_regclass('visita') IS NOT NULL AS existe`);
  console.log('Tabla visita lista:', r.rows[0].existe, '(db:', process.env.DB_NAME + ')');
  await client.end();
})().catch((e) => { console.error('DDL_ERROR', e.message); process.exit(1); });
