import { IStatsRepo } from "../contracts/stats-repo.contract.js";
import { toStorageReport } from "../domain/storage.js";

export const createHealthService = (
  getUsage: IStatsRepo["getUsage"],
  storageLimitMb: number,
) => {
  /**
   * 서버 상태 + 사용 현황.
   *
   * Render의 헬스체크와 랜딩의 웜업이 이 응답을 쓴다.
   * 그래서 DB가 대답하지 않아도 **예외를 밖으로 던지지 않는다.**
   * 여기서 던지면 헬스체크가 실패해 서버가 재시작되는데, DB 장애는 재시작으로 낫지 않는다.
   */
  const getHealth = async () => {
    try {
      const usage = await getUsage();

      return {
        status: "ok" as const,
        usage: {
          rooms: usage.rooms,
          registeredRooms: usage.registeredRooms,
          roomsWithPhotos: usage.roomsWithPhotos,
          posts: usage.posts,
          users: usage.users,
        },
        storage: toStorageReport(usage.databaseBytes, storageLimitMb),
      };
    } catch (err) {
      // 서버는 살아 있지만 DB를 못 읽는 상태. 숫자를 지어내지 않고 그대로 알린다.
      console.error("[health] DB 현황 조회 실패:", err);

      return { status: "degraded" as const, usage: null, storage: null };
    }
  };

  return { getHealth };
};

export type HealthServiceType = ReturnType<typeof createHealthService>;
