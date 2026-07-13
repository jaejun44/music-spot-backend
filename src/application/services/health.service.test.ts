import { jest, describe, test, expect } from "@jest/globals";
import { createHealthService } from "./health.service.js";
import type { IStatsRepo } from "../contracts/stats-repo.contract.js";

const MB = 1024 * 1024;

const 현황: Awaited<ReturnType<IStatsRepo["getUsage"]>> = {
  rooms: 578,
  registeredRooms: 2,
  roomsWithPhotos: 1,
  posts: 3,
  users: 4,
  databaseBytes: 256 * MB,
};

describe("서버 현황 조회(getHealth)", () => {
  test("사용 현황과 DB 용량을 함께 돌려준다", async () => {
    const getUsage = jest.fn<IStatsRepo["getUsage"]>().mockResolvedValue(현황);
    const { getHealth } = createHealthService(getUsage, 1024);

    const health = await getHealth();

    expect(health.status).toBe("ok");
    expect(health.usage).toEqual({
      rooms: 578,
      registeredRooms: 2,
      roomsWithPhotos: 1,
      posts: 3,
      users: 4,
    });
    // 256MB / 1024MB = 25%
    expect(health.storage).toEqual({
      usedMb: 256,
      limitMb: 1024,
      usedPercent: 25,
    });
  });

  test("유료 플랜으로 상한을 올리면 같은 용량이라도 여유가 늘어난다", async () => {
    const getUsage = jest.fn<IStatsRepo["getUsage"]>().mockResolvedValue(현황);
    const { getHealth } = createHealthService(getUsage, 10 * 1024);

    const health = await getHealth();

    expect(health.storage).toEqual({
      usedMb: 256,
      limitMb: 10240,
      usedPercent: 2.5,
    });
  });

  test("DB를 못 읽어도 예외를 던지지 않고 degraded로 알린다", async () => {
    const getUsage = jest
      .fn<IStatsRepo["getUsage"]>()
      .mockRejectedValue(new Error("DB 연결 실패"));
    const { getHealth } = createHealthService(getUsage, 1024);

    // 여기서 던지면 헬스체크가 실패해 서버가 재시작된다. DB 장애는 재시작으로 낫지 않는다.
    const health = await getHealth();

    expect(health.status).toBe("degraded");
    expect(health.usage).toBeNull();
    // 숫자를 지어내지 않는다. 0으로 채우면 "DB가 비었다"로 읽힌다.
    expect(health.storage).toBeNull();
  });
});
