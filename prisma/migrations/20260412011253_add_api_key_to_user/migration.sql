/*
  Warnings:

  - A unique constraint covering the columns `[api_key]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "api_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_api_key_key" ON "User"("api_key");
