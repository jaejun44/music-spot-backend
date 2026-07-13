import { prismaClient } from "../src/outbound/repos/prismaClient.js";

/**
 * 랜딩 페이지에 하드코딩되어 있던 연습실 4곳을 DB로 옮긴다.
 * 고정 id로 upsert하므로 여러 번 실행해도 중복이 쌓이지 않는다.
 */
const rooms = [
  {
    id: 1,
    name: "숨 음악연습실",
    location: "서울 노량진동",
    category: "합주룸",
    pricePerHour: 7000,
  },
  {
    id: 2,
    name: "스튜디오에스에이",
    location: "서울 신사동",
    category: "합주룸",
    pricePerHour: 10000,
  },
  {
    id: 3,
    name: "르씨엘 아트홀 분당점",
    location: "성남 정자동",
    category: "합주룸",
    pricePerHour: 8000,
  },
  {
    id: 4,
    name: "위저스트뮤직 역삼점",
    location: "서울 역삼동",
    category: "합주룸",
    pricePerHour: 5000,
  },
];

const main = async () => {
  for (const room of rooms) {
    await prismaClient.room.upsert({
      where: { id: room.id },
      update: room,
      create: room,
    });
  }

  // 고정 id로 insert했으므로 autoincrement 시퀀스를 마지막 id 뒤로 밀어준다.
  // 이걸 빼먹으면 이후 첫 자동 생성이 id=1로 시도되어 중복 키 에러가 난다.
  await prismaClient.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"Room"', 'id'), (SELECT COALESCE(MAX(id), 1) FROM "Room"))`,
  );

  console.log(`연습실 ${rooms.length}곳을 seed했습니다.`);
};

main()
  .catch((err) => {
    console.error("seed 실패:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
