// Kiểm tra nhanh CSDL Supabase: số bảng, số enum, liệt kê tên bảng
import "dotenv/config";
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const tables = await client.query(
  `select table_name from information_schema.tables
   where table_schema='public' and table_type='BASE TABLE' order by table_name`,
);
const enums = await client.query(
  `select count(*)::int as n from pg_type t
   join pg_namespace ns on ns.oid=t.typnamespace
   where ns.nspname='public' and t.typtype='e'`,
);
console.log(`Bảng: ${tables.rows.length} | Enum: ${enums.rows[0].n}`);
console.log(tables.rows.map((r) => r.table_name).join(", "));
await client.end();
