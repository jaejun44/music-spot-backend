-- 사용자가 올린 사진(최대 5장)과 홈페이지·예약 링크.
-- 파일 저장소가 없어 사진은 data URL 문자열로 담는다. 브라우저에서 미리 줄여서 보낸다.
-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "homepageUrl" TEXT;
