import { jest, describe, test, expect } from "@jest/globals";
import { createRoomService } from "./room.service.js";
import type { IRoomRepo } from "../contracts/room-repo.contract.js";
import type { Room } from "../../generated/prisma/client.js";
import { BusinessException } from "../../shared/exceptions/business.exception.js";

const 연습실 = (id: number, name: string): Room => ({
  id,
  name,
  location: "서울 노량진동",
  category: "합주룸",
  pricePerHour: 7000,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
});

describe("연습실 목록 조회(getRooms)", () => {
  test("repo가 준 목록을 그대로 돌려준다", async () => {
    const rooms = [연습실(1, "숨 음악연습실"), 연습실(2, "스튜디오에스에이")];
    const findAll = jest.fn<IRoomRepo["findAll"]>().mockResolvedValue(rooms);
    const findById = jest.fn<IRoomRepo["findById"]>();
    const { getRooms } = createRoomService(findAll, findById);

    const result = await getRooms();

    expect(result).toEqual(rooms);
    expect(result).toHaveLength(2);
    expect(findAll).toHaveBeenCalledTimes(1);
  });

  test("등록된 연습실이 없으면 빈 배열을 돌려준다 (에러가 아니다)", async () => {
    const findAll = jest.fn<IRoomRepo["findAll"]>().mockResolvedValue([]);
    const findById = jest.fn<IRoomRepo["findById"]>();
    const { getRooms } = createRoomService(findAll, findById);

    await expect(getRooms()).resolves.toEqual([]);
  });

  test("DB 조회가 실패하면 에러를 그대로 전파한다", async () => {
    const findAll = jest
      .fn<IRoomRepo["findAll"]>()
      .mockRejectedValue(new Error("DB 연결 실패"));
    const findById = jest.fn<IRoomRepo["findById"]>();
    const { getRooms } = createRoomService(findAll, findById);

    await expect(getRooms()).rejects.toThrow("DB 연결 실패");
  });
});

describe("연습실 상세 조회(getRoom)", () => {
  test("존재하는 id면 해당 연습실을 돌려준다", async () => {
    const room = 연습실(1, "숨 음악연습실");
    const findAll = jest.fn<IRoomRepo["findAll"]>();
    const findById = jest.fn<IRoomRepo["findById"]>().mockResolvedValue(room);
    const { getRoom } = createRoomService(findAll, findById);

    const result = await getRoom(1);

    expect(result).toEqual(room);
    expect(findById).toHaveBeenCalledWith(1);
  });

  test("없는 id면 404를 던진다", async () => {
    const findAll = jest.fn<IRoomRepo["findAll"]>();
    const findById = jest.fn<IRoomRepo["findById"]>().mockResolvedValue(null);
    const { getRoom } = createRoomService(findAll, findById);

    const err = await getRoom(999).catch((e) => e as BusinessException);

    expect(err).toBeInstanceOf(BusinessException);
    expect(err.message).toBe("존재하지 않는 연습실입니다.");
    expect(err.statusCode).toBe(404);
  });

  test("repo가 undefined를 반환해도(계약 위반) 404로 처리한다", async () => {
    const findAll = jest.fn<IRoomRepo["findAll"]>();
    const findById = jest
      .fn<IRoomRepo["findById"]>()
      .mockResolvedValue(undefined as never);
    const { getRoom } = createRoomService(findAll, findById);

    await expect(getRoom(1)).rejects.toThrow("존재하지 않는 연습실입니다.");
  });

  test("DB 조회가 실패하면 에러를 그대로 전파한다", async () => {
    const findAll = jest.fn<IRoomRepo["findAll"]>();
    const findById = jest
      .fn<IRoomRepo["findById"]>()
      .mockRejectedValue(new Error("DB 연결 실패"));
    const { getRoom } = createRoomService(findAll, findById);

    await expect(getRoom(1)).rejects.toThrow("DB 연결 실패");
  });
});
