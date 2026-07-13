import { IRoomRepo } from "../contracts/room-repo.contract.js";
import { NotFoundException } from "../../shared/exceptions/business.exception.js";

export const createRoomService = (
  findAll: IRoomRepo["findAll"],
  findById: IRoomRepo["findById"],
) => {
  // 연습실 목록 조회 (누구나 볼 수 있는 공개 API)
  const getRooms = async () => {
    const rooms = await findAll();
    return rooms;
  };

  // 연습실 상세 조회
  const getRoom = async (roomId: number) => {
    const room = await findById(roomId);
    if (!room) {
      throw new NotFoundException("존재하지 않는 연습실입니다.");
    }

    return room;
  };

  return { getRooms, getRoom };
};

export type RoomServiceType = ReturnType<typeof createRoomService>;
