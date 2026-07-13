import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prismaClient } from "../src/outbound/repos/prismaClient.js";

/**
 * 크롤링·정제한 연습실(prisma/data/rooms.json)을 DB에 넣는다.
 * JSON은 scripts/build-rooms.ts가 만든다. 원본 CSV는 저장소 밖에 있어 배포 서버에서는 이 JSON만 쓴다.
 *
 * 원본 URL(sourceUrl)을 기준으로 upsert하므로 여러 번 실행해도 중복이 쌓이지 않는다.
 */
type SeedRoom = {
  name: string;
  address: string;
  sido: string;
  gungu: string;
  category: string;
  pricePerHour: number | null;
  imageUrl: string | null;
  phone: string | null;
  rating: number | null;
  reviewCount: number | null;
  hours: string | null;
  sourceUrl: string;
};

const DATA_PATH = resolve(import.meta.dirname, "data/rooms.json");

const main = async () => {
  const rooms: SeedRoom[] = JSON.parse(readFileSync(DATA_PATH, "utf-8"));

  // 576곳을 한 건씩 왕복시키면 원격 DB에서 수 분이 걸린다. 트랜잭션으로 한 번에 밀어 넣는다.
  await prismaClient.$transaction(
    rooms.map((room) =>
      prismaClient.room.upsert({
        where: { sourceUrl: room.sourceUrl },
        update: room,
        create: room,
      }),
    ),
  );

  const total = await prismaClient.room.count();
  console.log(`연습실 ${rooms.length}곳을 seed했습니다. (DB 총 ${total}곳)`);
};

main()
  .catch((err) => {
    console.error("seed 실패:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
