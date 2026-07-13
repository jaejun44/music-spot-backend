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

// 사용자가 직접 등록하는 연습실. 크롤링 데이터에만 있는 값(평점·후기 수·원본 URL)은 받지 않는다.
export type NewRoom = {
  name: string;
  address: string;
  sido: string;
  gungu: string;
  category: string;
  pricePerHour: number | null;
  phone: string | null;
  hours: string | null;
  ownerId: number;
};

export interface IRoomRepo {
  search: (query: RoomSearchQuery) => Promise<{ rooms: Room[]; total: number }>;
  findById: (id: number) => Promise<Room | null>;
  countByRegion: () => Promise<RegionCount[]>;
  create: (room: NewRoom) => Promise<Room>;
  deleteById: (id: number) => Promise<void>;
}
