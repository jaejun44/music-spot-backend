import { Room } from "../../generated/prisma/client.js";

// 검색 조건. 지역·카테고리·키워드는 모두 선택값이며, 비어 있으면 "전체"를 뜻한다.
export type RoomSearchQuery = {
  sido?: string;
  gungu?: string;
  category?: string;
  keyword?: string;
  skip: number;
  take: number;
};

// 지역 드롭다운을 채우기 위한 집계 결과.
export type RegionCount = {
  sido: string;
  gungu: string;
  count: number;
};

export interface IRoomRepo {
  search: (query: RoomSearchQuery) => Promise<{ rooms: Room[]; total: number }>;
  findById: (id: number) => Promise<Room | null>;
  countByRegion: () => Promise<RegionCount[]>;
}
