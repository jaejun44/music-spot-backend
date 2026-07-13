import { jest, describe, test, expect } from "@jest/globals";
import { createRoomService } from "./room.service.js";
import type { IRoomRepo } from "../contracts/room-repo.contract.js";
import type { Room } from "../../generated/prisma/client.js";
import { BusinessException } from "../../shared/exceptions/business.exception.js";
import { catchBusinessException } from "../../shared/testing/catch-error.js";

const 연습실 = (id: number, name: string): Room => ({
  id,
  name,
  address: "서울특별시 마포구 동교동 155-20",
  sido: "서울",
  gungu: "마포구",
  category: "합주실",
  pricePerHour: 7000,
  imageUrl: "https://example.com/room.jpg",
  images: [],
  homepageUrl: null,
  phone: "010-1234-5678",
  rating: 4.5,
  reviewCount: 10,
  hours: "0~24시",
  sourceUrl: `https://www.spacecloud.kr/space/${id}`,
  ownerId: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
});

describe("연습실 검색(searchRooms)", () => {
  test("검색 조건을 repo에 넘기고, 결과에 페이지 정보를 붙여 돌려준다", async () => {
    const rooms = [연습실(1, "테넷 합주실"), 연습실(2, "리엠뮤직합주실")];
    const search = jest
      .fn<IRoomRepo["search"]>()
      .mockResolvedValue({ rooms, total: 2 });
    const findById = jest.fn<IRoomRepo["findById"]>();
    const countByRegion = jest.fn<IRoomRepo["countByRegion"]>();
    const create = jest.fn<IRoomRepo["create"]>();
    const deleteById = jest.fn<IRoomRepo["deleteById"]>();
    const { searchRooms } = createRoomService(
      search,
      findById,
      countByRegion,
      create,
      deleteById,
    );

    const result = await searchRooms({
      sido: "서울",
      gungu: "마포구",
      category: "합주실",
      keyword: "드럼",
      page: 1,
      size: 12,
    });

    expect(result).toEqual({
      rooms,
      total: 2,
      page: 1,
      size: 12,
      totalPages: 1,
      hasNext: false,
    });
    expect(search).toHaveBeenCalledWith({
      sido: "서울",
      gungu: "마포구",
      category: "합주실",
      keyword: "드럼",
      skip: 0,
      take: 12,
    });
  });

  test("2페이지를 요청하면 앞 페이지 몫만큼 건너뛴다", async () => {
    const search = jest
      .fn<IRoomRepo["search"]>()
      .mockResolvedValue({ rooms: [], total: 30 });
    const findById = jest.fn<IRoomRepo["findById"]>();
    const countByRegion = jest.fn<IRoomRepo["countByRegion"]>();
    const create = jest.fn<IRoomRepo["create"]>();
    const deleteById = jest.fn<IRoomRepo["deleteById"]>();
    const { searchRooms } = createRoomService(
      search,
      findById,
      countByRegion,
      create,
      deleteById,
    );

    const result = await searchRooms({ page: 2, size: 12 });

    expect(search).toHaveBeenCalledWith({ skip: 12, take: 12 });
    // 30건을 12개씩 = 3페이지. 2페이지에서는 아직 다음 페이지가 남아 있다.
    expect(result.totalPages).toBe(3);
    expect(result.hasNext).toBe(true);
  });

  test("조건에 맞는 연습실이 없으면 빈 결과를 돌려준다 (에러가 아니다)", async () => {
    const search = jest
      .fn<IRoomRepo["search"]>()
      .mockResolvedValue({ rooms: [], total: 0 });
    const findById = jest.fn<IRoomRepo["findById"]>();
    const countByRegion = jest.fn<IRoomRepo["countByRegion"]>();
    const create = jest.fn<IRoomRepo["create"]>();
    const deleteById = jest.fn<IRoomRepo["deleteById"]>();
    const { searchRooms } = createRoomService(
      search,
      findById,
      countByRegion,
      create,
      deleteById,
    );

    const result = await searchRooms({
      keyword: "없는연습실",
      page: 1,
      size: 12,
    });

    expect(result.rooms).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
    expect(result.hasNext).toBe(false);
  });

  test("DB 조회가 실패하면 에러를 그대로 전파한다", async () => {
    const search = jest
      .fn<IRoomRepo["search"]>()
      .mockRejectedValue(new Error("DB 연결 실패"));
    const findById = jest.fn<IRoomRepo["findById"]>();
    const countByRegion = jest.fn<IRoomRepo["countByRegion"]>();
    const create = jest.fn<IRoomRepo["create"]>();
    const deleteById = jest.fn<IRoomRepo["deleteById"]>();
    const { searchRooms } = createRoomService(
      search,
      findById,
      countByRegion,
      create,
      deleteById,
    );

    await expect(searchRooms({ page: 1, size: 12 })).rejects.toThrow(
      "DB 연결 실패",
    );
  });
});

describe("연습실 상세 조회(getRoom)", () => {
  test("존재하는 id면 해당 연습실을 돌려준다", async () => {
    const room = 연습실(1, "테넷 합주실");
    const search = jest.fn<IRoomRepo["search"]>();
    const findById = jest.fn<IRoomRepo["findById"]>().mockResolvedValue(room);
    const countByRegion = jest.fn<IRoomRepo["countByRegion"]>();
    const create = jest.fn<IRoomRepo["create"]>();
    const deleteById = jest.fn<IRoomRepo["deleteById"]>();
    const { getRoom } = createRoomService(
      search,
      findById,
      countByRegion,
      create,
      deleteById,
    );

    const result = await getRoom(1);

    expect(result).toEqual(room);
    expect(findById).toHaveBeenCalledWith(1);
  });

  test("없는 id면 404를 던진다", async () => {
    const search = jest.fn<IRoomRepo["search"]>();
    const findById = jest.fn<IRoomRepo["findById"]>().mockResolvedValue(null);
    const countByRegion = jest.fn<IRoomRepo["countByRegion"]>();
    const create = jest.fn<IRoomRepo["create"]>();
    const deleteById = jest.fn<IRoomRepo["deleteById"]>();
    const { getRoom } = createRoomService(
      search,
      findById,
      countByRegion,
      create,
      deleteById,
    );

    const err = await catchBusinessException(() => getRoom(999));

    expect(err).toBeInstanceOf(BusinessException);
    expect(err.message).toBe("존재하지 않는 연습실입니다.");
    expect(err.statusCode).toBe(404);
  });

  test("repo가 undefined를 반환해도(계약 위반) 404로 처리한다", async () => {
    const search = jest.fn<IRoomRepo["search"]>();
    const findById = jest
      .fn<IRoomRepo["findById"]>()
      .mockResolvedValue(undefined as never);
    const countByRegion = jest.fn<IRoomRepo["countByRegion"]>();
    const create = jest.fn<IRoomRepo["create"]>();
    const deleteById = jest.fn<IRoomRepo["deleteById"]>();
    const { getRoom } = createRoomService(
      search,
      findById,
      countByRegion,
      create,
      deleteById,
    );

    await expect(getRoom(1)).rejects.toThrow("존재하지 않는 연습실입니다.");
  });

  test("DB 조회가 실패하면 에러를 그대로 전파한다", async () => {
    const search = jest.fn<IRoomRepo["search"]>();
    const findById = jest
      .fn<IRoomRepo["findById"]>()
      .mockRejectedValue(new Error("DB 연결 실패"));
    const countByRegion = jest.fn<IRoomRepo["countByRegion"]>();
    const create = jest.fn<IRoomRepo["create"]>();
    const deleteById = jest.fn<IRoomRepo["deleteById"]>();
    const { getRoom } = createRoomService(
      search,
      findById,
      countByRegion,
      create,
      deleteById,
    );

    await expect(getRoom(1)).rejects.toThrow("DB 연결 실패");
  });
});

describe("지역 목록 조회(getRegions)", () => {
  test("납작한 집계를 시도별로 접고, 연습실이 많은 지역을 앞에 둔다", async () => {
    const search = jest.fn<IRoomRepo["search"]>();
    const findById = jest.fn<IRoomRepo["findById"]>();
    const countByRegion = jest
      .fn<IRoomRepo["countByRegion"]>()
      .mockResolvedValue([
        { sido: "경기", gungu: "고양시", count: 25 },
        { sido: "서울", gungu: "강남구", count: 39 },
        { sido: "서울", gungu: "마포구", count: 57 },
      ]);
    const create = jest.fn<IRoomRepo["create"]>();
    const deleteById = jest.fn<IRoomRepo["deleteById"]>();
    const { getRegions } = createRoomService(
      search,
      findById,
      countByRegion,
      create,
      deleteById,
    );

    const regions = await getRegions();

    expect(regions).toEqual([
      {
        sido: "서울",
        count: 96,
        gungus: [
          { gungu: "마포구", count: 57 },
          { gungu: "강남구", count: 39 },
        ],
      },
      { sido: "경기", count: 25, gungus: [{ gungu: "고양시", count: 25 }] },
    ]);
  });
});

describe("연습실 등록(registerRoom)", () => {
  const 등록요청 = {
    name: "우리 밴드 합주실",
    address: "서울특별시 마포구 동교동 155-20 지하 1층",
    category: "합주실",
    pricePerHour: 15000,
    phone: "010-1234-5678",
    hours: "10~24시",
    homepageUrl: "https://example.com",
    images: ["data:image/jpeg;base64,AAAA"],
    ownerId: 7,
  };

  test("주소에서 지역을 뽑아 repo에 넘긴다", async () => {
    const search = jest.fn<IRoomRepo["search"]>();
    const findById = jest.fn<IRoomRepo["findById"]>();
    const countByRegion = jest.fn<IRoomRepo["countByRegion"]>();
    const create = jest
      .fn<IRoomRepo["create"]>()
      .mockResolvedValue(연습실(1, "우리 밴드 합주실"));
    const deleteById = jest.fn<IRoomRepo["deleteById"]>();
    const { registerRoom } = createRoomService(
      search,
      findById,
      countByRegion,
      create,
      deleteById,
    );

    await registerRoom(등록요청);

    // 지역을 사용자에게 따로 묻지 않는다. 크롤링 시드와 같은 표기("서울")여야 같은 필터에 걸린다.
    expect(create).toHaveBeenCalledWith({
      ...등록요청,
      sido: "서울",
      gungu: "마포구",
    });
  });

  test("지역을 알아볼 수 없는 주소면 400을 던지고 DB에 쓰지 않는다", async () => {
    const search = jest.fn<IRoomRepo["search"]>();
    const findById = jest.fn<IRoomRepo["findById"]>();
    const countByRegion = jest.fn<IRoomRepo["countByRegion"]>();
    const create = jest.fn<IRoomRepo["create"]>();
    const deleteById = jest.fn<IRoomRepo["deleteById"]>();
    const { registerRoom } = createRoomService(
      search,
      findById,
      countByRegion,
      create,
      deleteById,
    );

    const err = await catchBusinessException(() =>
      registerRoom({ ...등록요청, address: "홍대 근처 지하" }),
    );

    expect(err.statusCode).toBe(400);
    // 지역이 비면 검색에 영영 걸리지 않는 연습실이 생긴다. 저장 자체를 막는다.
    expect(create).not.toHaveBeenCalled();
  });
});

describe("연습실 삭제(deleteRoom)", () => {
  test("등록자 본인이면 지운다", async () => {
    const search = jest.fn<IRoomRepo["search"]>();
    const findById = jest
      .fn<IRoomRepo["findById"]>()
      .mockResolvedValue({ ...연습실(1, "우리 밴드 합주실"), ownerId: 7 });
    const countByRegion = jest.fn<IRoomRepo["countByRegion"]>();
    const create = jest.fn<IRoomRepo["create"]>();
    const deleteById = jest.fn<IRoomRepo["deleteById"]>();
    const { deleteRoom } = createRoomService(
      search,
      findById,
      countByRegion,
      create,
      deleteById,
    );

    await deleteRoom({ roomId: 1, userId: 7 });

    expect(deleteById).toHaveBeenCalledWith(1);
  });

  test("남이 등록한 연습실이면 403을 던지고 DB에서 지우지 않는다", async () => {
    const search = jest.fn<IRoomRepo["search"]>();
    const findById = jest
      .fn<IRoomRepo["findById"]>()
      .mockResolvedValue({ ...연습실(1, "우리 밴드 합주실"), ownerId: 7 });
    const countByRegion = jest.fn<IRoomRepo["countByRegion"]>();
    const create = jest.fn<IRoomRepo["create"]>();
    const deleteById = jest.fn<IRoomRepo["deleteById"]>();
    const { deleteRoom } = createRoomService(
      search,
      findById,
      countByRegion,
      create,
      deleteById,
    );

    const err = await catchBusinessException(() =>
      deleteRoom({ roomId: 1, userId: 999 }),
    );

    expect(err.statusCode).toBe(403);
    expect(err.message).toBe("내가 등록한 연습실만 삭제할 수 있습니다.");
    expect(deleteById).not.toHaveBeenCalled();
  });

  test("크롤링으로 들어온 연습실(주인 없음)은 아무도 지울 수 없다", async () => {
    const search = jest.fn<IRoomRepo["search"]>();
    // 시드 데이터는 ownerId가 null이다.
    const findById = jest
      .fn<IRoomRepo["findById"]>()
      .mockResolvedValue(연습실(1, "홍대 예쎄뮤직 연습실 합주실"));
    const countByRegion = jest.fn<IRoomRepo["countByRegion"]>();
    const create = jest.fn<IRoomRepo["create"]>();
    const deleteById = jest.fn<IRoomRepo["deleteById"]>();
    const { deleteRoom } = createRoomService(
      search,
      findById,
      countByRegion,
      create,
      deleteById,
    );

    const err = await catchBusinessException(() =>
      deleteRoom({ roomId: 1, userId: 7 }),
    );

    expect(err.statusCode).toBe(403);
    expect(deleteById).not.toHaveBeenCalled();
  });

  test("없는 연습실이면 404를 던지고 DB에서 지우지 않는다", async () => {
    const search = jest.fn<IRoomRepo["search"]>();
    const findById = jest.fn<IRoomRepo["findById"]>().mockResolvedValue(null);
    const countByRegion = jest.fn<IRoomRepo["countByRegion"]>();
    const create = jest.fn<IRoomRepo["create"]>();
    const deleteById = jest.fn<IRoomRepo["deleteById"]>();
    const { deleteRoom } = createRoomService(
      search,
      findById,
      countByRegion,
      create,
      deleteById,
    );

    const err = await catchBusinessException(() =>
      deleteRoom({ roomId: 999, userId: 7 }),
    );

    expect(err.statusCode).toBe(404);
    expect(deleteById).not.toHaveBeenCalled();
  });
});
