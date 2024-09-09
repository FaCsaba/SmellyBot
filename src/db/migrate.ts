import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
    connectionString: process.env['DATABASE_URL']
})

const db = drizzle(pool)

async function main() {
    console.log("Migration started");
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("Migration ended");
    process.exit(0);
}

(async () => await main())();