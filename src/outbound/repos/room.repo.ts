import { IRoomRepo } from "../../application/contracts/room-repo.contract.js";
import { prismaClient } from "./prismaClient.js";

export const createRoomRepo = (): IRoomRepo => {
  // 전체 연습실 조회 (등록된 순서대로)
  const findAll: IRoomRepo["findAll"] = async () => {
    return prismaClient.room.findMany({ orderBy: { id: "asc" } });
  };

  // ID로 연습실 조회
  const findById: IRoomRepo["findById"] = async (id) => {
    return prismaClient.room.findUnique({ where: { id } });
  };

  return { findAll, findById };
};
