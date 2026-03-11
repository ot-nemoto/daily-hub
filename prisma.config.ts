import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// ローカル開発時は .env.local から読み込む（Vercel では process.env に直接設定される）
config({ path: ".env.local" });

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) throw new Error("DATABASE_URL is not set");

const directUrl = process.env["DIRECT_URL"];
if (!directUrl) throw new Error("DIRECT_URL is not set");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: directUrl,
  },
});
