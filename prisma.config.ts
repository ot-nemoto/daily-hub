import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local" });

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
