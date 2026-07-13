import { IStatsRepo } from "../../application/contracts/stats-repo.contract.js";
import { prismaClient } from "./prismaClient.js";

export const createStatsRepo = (): IStatsRepo => {
  const getUsage: IStatsRepo["getUsage"] = async () => {
    // 헬스체크는 자주 불린다(Render 감시 + 랜딩 웜업). 왕복 한 번으로 끝낸다.
    const [rooms, registeredRooms, roomsWithPhotos, posts, users, size] =
      await prismaClient.$transaction([
        prismaClient.room.count(),
        // 사용자가 직접 등록한 곳 — 크롤링 시드(ownerId = null)와 구분되는 B2B 지표다.
        prismaClient.room.count({ where: { ownerId: { not: null } } }),
        prismaClient.room.count({ where: { images: { isEmpty: false } } }),
        prismaClient.post.count(),
        prismaClient.user.count(),
        // 사진이 DB에 통째로 들어가는 구조라, 실제로 차지한 용량을 Postgres에게 직접 묻는다.
        prismaClient.$queryRaw<
          { size: bigint }[]
        >`SELECT pg_database_size(current_database()) AS size`,
      ]);

    return {
      rooms,
      registeredRooms,
      roomsWithPhotos,
      posts,
      users,
      // pg_database_size는 bigint를 준다. JSON으로 나가려면 number여야 한다(1GB는 안전 범위).
      databaseBytes: Number(size[0]?.size ?? 0),
    };
  };

  return { getUsage };
};
