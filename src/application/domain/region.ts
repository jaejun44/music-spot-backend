import { RegionCount } from "../contracts/room-repo.contract.js";

// 광역시·도 표기가 제각각이라(서울 / 서울특별시) 짧은 이름으로 통일한다.
// 이 이름이 곧 검색 필터의 값이므로, 크롤링 시드와 사용자 등록이 같은 표기를 써야 섞여서 검색된다.
const SIDO_ALIASES: Record<string, string> = {
  서울: "서울",
  서울특별시: "서울",
  경기: "경기",
  경기도: "경기",
  인천: "인천",
  인천광역시: "인천",
  부산: "부산",
  부산광역시: "부산",
  대구: "대구",
  대구광역시: "대구",
  대전: "대전",
  대전광역시: "대전",
  광주: "광주",
  광주광역시: "광주",
  울산: "울산",
  울산광역시: "울산",
  세종: "세종",
  세종특별자치시: "세종",
  강원: "강원",
  강원도: "강원",
  강원특별자치도: "강원",
  충북: "충북",
  충청북도: "충북",
  충남: "충남",
  충청남도: "충남",
  전북: "전북",
  전라북도: "전북",
  전북특별자치도: "전북",
  전남: "전남",
  전라남도: "전남",
  경북: "경북",
  경상북도: "경북",
  경남: "경남",
  경상남도: "경남",
  제주: "제주",
  제주특별자치도: "제주",
};

/**
 * "서울특별시 마포구 동교동 155-20" → { sido: "서울", gungu: "마포구" }
 * 형태가 아니면 null. 지역 검색이 성립하려면 시/도와 시·군·구가 반드시 나와야 한다.
 */
export const parseAddressRegion = (address: string) => {
  const [first, second] = address.trim().split(/\s+/);
  const sido = SIDO_ALIASES[first ?? ""];
  if (!sido || !second || !/(구|시|군)$/.test(second)) return null;

  return { sido, gungu: second };
};

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
