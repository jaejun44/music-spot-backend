import { IRoomRepo } from "../contracts/room-repo.contract.js";
import { toRegionTree } from "../domain/region.js";
import { NotFoundException } from "../../shared/exceptions/business.exception.js";

export type SearchRoomsParams = {
  sido?: string;
  gungu?: string;
  category?: string;
  keyword?: string;
  page: number;
  size: number;
};

export const createRoomService = (
  search: IRoomRepo["search"],
  findById: IRoomRepo["findById"],
  countByRegion: IRoomRepo["countByRegion"],
) => {
  // 연습실 검색 (지역·카테고리·키워드 + 페이지네이션). 로그인 없이 누구나 쓴다.
  const searchRooms = async ({ page, size, ...filters }: SearchRoomsParams) => {
    const { rooms, total } = await search({
      ...filters,
      skip: (page - 1) * size,
      take: size,
    });

    // 프론트가 "더 보기" 버튼을 언제 감출지 스스로 계산하지 않도록 마지막 페이지 여부까지 같이 준다.
    const totalPages = Math.ceil(total / size);

    return { rooms, total, page, size, totalPages, hasNext: page < totalPages };
  };

  // 연습실 상세 조회
  const getRoom = async (roomId: number) => {
    const room = await findById(roomId);
    if (!room) {
      throw new NotFoundException("존재하지 않는 연습실입니다.");
    }

    return room;
  };

  // 지역 드롭다운 데이터. 연습실이 하나도 없는 지역은 애초에 집계에 잡히지 않는다.
  const getRegions = async () => {
    const counts = await countByRegion();

    return toRegionTree(counts);
  };

  return { searchRooms, getRoom, getRegions };
};

export type RoomServiceType = ReturnType<typeof createRoomService>;
