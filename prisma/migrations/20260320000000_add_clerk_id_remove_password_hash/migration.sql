-- AlterTable: add clerkId column (nullable, unique)
ALTER TABLE "User" ADD COLUMN "clerkId" TEXT;
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- AlterTable: drop passwordHash column
ALTER TABLE "User" DROP COLUMN "passwordHash";
