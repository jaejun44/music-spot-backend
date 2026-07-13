import { IRoomRepo } from "../../application/contracts/room-repo.contract.js";
import { Prisma } from "../../generated/prisma/client.js";
import { prismaClient } from "./prismaClient.js";

export const createRoomRepo = (): IRoomRepo => {
  // 연습실 검색. 비어 있는 조건은 where에 넣지 않아 "전체"가 된다.
  const search: IRoomRepo["search"] = async ({
    sido,
    gungu,
    category,
    keyword,
    skip,
    take,
  }) => {
    const where: Prisma.RoomWhereInput = {
      ...(sido && { sido }),
      ...(gungu && { gungu }),
      ...(category && { category }),
      // 사용자는 "홍대", "드럼"처럼 이름으로도 찾고 "동교동"처럼 주소로도 찾는다.
      ...(keyword && {
        OR: [
          { name: { contains: keyword, mode: "insensitive" } },
          { address: { contains: keyword, mode: "insensitive" } },
        ],
      }),
    };

    // 목록과 총 개수는 같은 시점의 스냅샷이어야 페이지 수가 어긋나지 않는다.
    const [rooms, total] = await prismaClient.$transaction([
      prismaClient.room.findMany({
        where,
        orderBy: [
          // 사용자가 직접 등록한 곳(ownerId 있음)을 먼저 보여준다.
          // 신규 등록은 후기가 없어, 후기순으로만 정렬하면 576곳 뒤에 영영 묻힌다.
          { ownerId: { sort: "desc", nulls: "last" } },
          // 그다음은 후기 많은 곳. Postgres는 DESC에서 NULL을 먼저 주므로 뒤로 보낸다.
          { reviewCount: { sort: "desc", nulls: "last" } },
          { id: "asc" },
        ],
        skip,
        take,
      }),
      prismaClient.room.count({ where }),
    ]);

    return { rooms, total };
  };

  // ID로 연습실 조회
  const findById: IRoomRepo["findById"] = async (id) => {
    return prismaClient.room.findUnique({ where: { id } });
  };

  // 지역별 연습실 개수 집계 (지역 드롭다운용)
  const countByRegion: IRoomRepo["countByRegion"] = async () => {
    const grouped = await prismaClient.room.groupBy({
      by: ["sido", "gungu"],
      _count: { _all: true },
    });

    return grouped.map(({ sido, gungu, _count }) => ({
      sido,
      gungu,
      count: _count._all,
    }));
  };

  // 연습실 등록. 평점·후기 수·이미지는 크롤링 데이터에만 있는 값이라 비워 둔다.
  const create: IRoomRepo["create"] = async (room) => {
    return prismaClient.room.create({ data: room });
  };

  // 연습실 삭제. 등록자 확인은 service가 이미 끝냈다.
  const deleteById: IRoomRepo["deleteById"] = async (id) => {
    await prismaClient.room.delete({ where: { id } });
  };

  return { search, findById, countByRegion, create, deleteById };
};
