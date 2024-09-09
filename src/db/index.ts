import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from "pg";
import * as schema from "./schema";
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env['DATABASE_URL']!
if (DATABASE_URL === undefined) throw new Error("DATABASE_URL not found in your .env file!");

const client = new Client({
    connectionString: DATABASE_URL
});

client.connect();

export const db = drizzle(client, { schema });