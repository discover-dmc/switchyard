import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function bootstrap() {
  const schema = await readFile(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  await pool.query(schema);
}
