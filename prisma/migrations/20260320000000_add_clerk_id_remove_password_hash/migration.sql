-- AlterTable: add clerk_id column (nullable, unique)
ALTER TABLE "User" ADD COLUMN "clerk_id" TEXT;
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerk_id");

-- AlterTable: drop passwordHash column
ALTER TABLE "User" DROP COLUMN "passwordHash";
