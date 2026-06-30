-- CreateTable
CREATE TABLE "DayOff" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "DayOff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DayOff_date_idx" ON "DayOff"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DayOff_user_id_date_key" ON "DayOff"("user_id", "date");

-- AddForeignKey
ALTER TABLE "DayOff" ADD CONSTRAINT "DayOff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
