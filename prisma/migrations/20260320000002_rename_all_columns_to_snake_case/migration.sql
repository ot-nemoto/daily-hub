-- Rename User columns to snake_case
ALTER TABLE "User" RENAME COLUMN "isActive" TO "is_active";
ALTER TABLE "User" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "User" RENAME COLUMN "updatedAt" TO "updated_at";

-- Rename Invitation columns to snake_case
ALTER TABLE "Invitation" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "Invitation" RENAME COLUMN "usedAt" TO "used_at";
ALTER TABLE "Invitation" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "Invitation" RENAME COLUMN "invitedById" TO "invited_by_id";

-- Rename Report columns to snake_case
ALTER TABLE "Report" RENAME COLUMN "workContent" TO "work_content";
ALTER TABLE "Report" RENAME COLUMN "tomorrowPlan" TO "tomorrow_plan";
ALTER TABLE "Report" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "Report" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "Report" RENAME COLUMN "authorId" TO "author_id";

-- Rename Comment columns to snake_case
ALTER TABLE "Comment" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "Comment" RENAME COLUMN "reportId" TO "report_id";
ALTER TABLE "Comment" RENAME COLUMN "authorId" TO "author_id";
