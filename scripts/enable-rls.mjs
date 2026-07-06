// Bật Row Level Security trên toàn bộ bảng public.
// Backend (Prisma, role postgres = table owner) không bị ảnh hưởng;
// REST/anon key bị khóa hoàn toàn vì không có policy nào.
import "dotenv/config";
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const { rows } = await client.query(
  `select table_name from information_schema.tables
   where table_schema='public' and table_type='BASE TABLE'`,
);
for (const { table_name } of rows) {
  await client.query(`alter table public."${table_name}" enable row level security`);
  console.log(`✅ RLS bật: ${table_name}`);
}
await client.end();
console.log(`\nXong — ${rows.length} bảng đã bật RLS.`);
