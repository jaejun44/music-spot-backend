import { IRoomRepo } from "../contracts/room-repo.contract.js";
import { parseAddressRegion, toRegionTree } from "../domain/region.js";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "../../shared/exceptions/business.exception.js";

export type SearchRoomsParams = {
  sido?: string;
  gungu?: string;
  category?: string;
  keyword?: string;
  page: number;
  size: number;
};

export type RegisterRoomParams = {
  name: string;
  address: string;
  category: string;
  pricePerHour: number | null;
  phone: string | null;
  hours: string | null;
  ownerId: number;
};

export const createRoomService = (
  search: IRoomRepo["search"],
  findById: IRoomRepo["findById"],
  countByRegion: IRoomRepo["countByRegion"],
  create: IRoomRepo["create"],
  deleteById: IRoomRepo["deleteById"],
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

  // 연습실 등록 (로그인 필수 — ownerId는 미들웨어가 검증한 토큰에서 나온다)
  const registerRoom = async ({ address, ...rest }: RegisterRoomParams) => {
    // 지역은 사용자에게 따로 묻지 않고 주소에서 뽑는다. 크롤링 시드와 같은 표기여야 같은 필터에 걸린다.
    const region = parseAddressRegion(address);
    if (!region) {
      throw new BadRequestException(
        "주소는 시/도와 시·군·구로 시작해야 합니다. (예: 서울 마포구 동교동 155-20)",
      );
    }

    return create({ ...rest, address, ...region });
  };

  // 연습실 삭제 (등록자 본인만)
  const deleteRoom = async ({
    roomId,
    userId,
  }: {
    roomId: number;
    userId: number;
  }) => {
    const room = await findById(roomId);
    if (!room) {
      throw new NotFoundException("존재하지 않는 연습실입니다.");
    }

    // 크롤링으로 들어온 연습실은 주인이 없다(ownerId === null). 아무도 지울 수 없어야 한다.
    if (room.ownerId !== userId) {
      throw new ForbiddenException("내가 등록한 연습실만 삭제할 수 있습니다.");
    }

    await deleteById(roomId);
  };

  return { searchRooms, getRoom, getRegions, registerRoom, deleteRoom };
};

export type RoomServiceType = ReturnType<typeof createRoomService>;
