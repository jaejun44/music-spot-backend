-- 하드코딩으로 시드했던 연습실 4곳은 크롤링 데이터(576곳)로 완전히 대체된다.
-- 새 필수 컬럼(address, sido, gungu, sourceUrl)에 채워 넣을 값이 없으므로 먼저 비운다.
DELETE FROM "Room";

-- AlterTable
ALTER TABLE "Room" DROP COLUMN "location",
ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "sido" TEXT NOT NULL,
ADD COLUMN     "gungu" TEXT NOT NULL,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "reviewCount" INTEGER,
ADD COLUMN     "hours" TEXT,
ADD COLUMN     "sourceUrl" TEXT NOT NULL,
ALTER COLUMN "pricePerHour" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Post" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_sourceUrl_key" ON "Room"("sourceUrl");

-- CreateIndex
CREATE INDEX "Room_sido_gungu_idx" ON "Room"("sido", "gungu");

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
