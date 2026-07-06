import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma CLI (migrate/db push/studio) dùng SESSION POOLER (port 5432) của Supabase.
// Runtime app dùng DATABASE_URL (transaction pooler 6543) qua driver adapter — xem src/lib/prisma.ts
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DIRECT_URL ?? "",
  },
});
