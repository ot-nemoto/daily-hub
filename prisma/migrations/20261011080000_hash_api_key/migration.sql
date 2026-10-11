-- APIキーを平文保存からハッシュ保存へ移行する。

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "api_key_created_at" TIMESTAMP(3),
ADD COLUMN     "api_key_hash" TEXT,
ADD COLUMN     "api_key_last_used_at" TIMESTAMP(3),
ADD COLUMN     "api_key_prefix" TEXT;

-- 既存の平文キーをハッシュ化して移行する（利用者の再発行は不要）。
--
-- バイト列への変換に `api_key::bytea` を使ってはならない。PostgreSQL は text から
-- 任意の型への明示的キャストを I/O 変換キャスト（bytea なら byteain で解析）として
-- 許可するため、エラーにならずに**静かに異なる値**になるケースがある:
--   - `\x` で始まる値は hex 形式として解釈される（例: '\x41' は 1 バイトの A）
--   - バックスラッシュはエスケープとして解釈され、不正なエスケープはエラーになる
-- convert_to(..., 'UTF8') は常に UTF-8 バイト列を返すため、アプリ側の hashApiKey()
-- （UTF-8 バイト列の SHA-256・hex）と必ず一致する。
--
-- 元の発行日時は記録がないため、api_key_created_at は移行時刻とする。
UPDATE "User"
SET "api_key_hash" = encode(sha256(convert_to("api_key", 'UTF8')), 'hex'),
    "api_key_prefix" = left("api_key", 8),
    "api_key_created_at" = CURRENT_TIMESTAMP
WHERE "api_key" IS NOT NULL;

-- DropIndex
DROP INDEX "User_api_key_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "api_key";

-- CreateIndex
CREATE UNIQUE INDEX "User_api_key_hash_key" ON "User"("api_key_hash");
