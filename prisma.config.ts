// Prisma configuration for VexiumVerse
// Uses dotenv to load .env.local for Next.js compatibility
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local file (Next.js convention)
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use DIRECT_URL for migrations (bypasses pgbouncer)
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
