export type StorageReport = {
  usedMb: number;
  limitMb: number;
  usedPercent: number;
};

const BYTES_PER_MB = 1024 * 1024;

/** 소수점 한 자리까지만. 용량 현황은 1MB 단위로 정확할 필요가 없다. */
const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * DB가 상한의 몇 %를 썼는지 계산한다.
 * 사진이 DB에 통째로 들어가는 구조라, 이 숫자가 유료 전환 시점을 알려주는 지표다.
 * Postgres는 꽉 차면 느려지는 게 아니라 쓰기가 실패하므로, 차기 전에 알아야 한다.
 */
export const toStorageReport = (
  databaseBytes: number,
  limitMb: number,
): StorageReport => {
  const usedMb = databaseBytes / BYTES_PER_MB;

  return {
    usedMb: round1(usedMb),
    limitMb,
    usedPercent: round1((usedMb / limitMb) * 100),
  };
};
