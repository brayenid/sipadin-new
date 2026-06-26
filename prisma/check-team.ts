import "dotenv/config";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const teams = await pool.query('SELECT id, name FROM "Team"');
  console.log("Teams in DB:", JSON.stringify(teams.rows, null, 2));
  const users = await pool.query('SELECT id, username, "teamId" FROM "User"');
  console.log("Users in DB:", JSON.stringify(users.rows, null, 2));
  await pool.end();
}

main();
