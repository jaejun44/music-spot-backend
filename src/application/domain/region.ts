import { RegionCount } from "../contracts/room-repo.contract.js";

export type RegionTree = {
  sido: string;
  count: number;
  gungus: { gungu: string; count: number }[];
};

/**
 * (시도, 구) 납작한 집계를 화면의 2단 드롭다운 모양으로 접는다.
 * 연습실이 많은 지역이 위에 오도록 정렬한다 — 사용자는 대부분 서울/경기를 고르기 때문이다.
 */
export const toRegionTree = (counts: RegionCount[]): RegionTree[] => {
  const bySido = new Map<string, RegionTree>();

  for (const { sido, gungu, count } of counts) {
    const node = bySido.get(sido) ?? { sido, count: 0, gungus: [] };
    node.count += count;
    node.gungus.push({ gungu, count });
    bySido.set(sido, node);
  }

  for (const node of bySido.values()) {
    node.gungus.sort((a, b) => b.count - a.count);
  }

  return [...bySido.values()].sort((a, b) => b.count - a.count);
};
