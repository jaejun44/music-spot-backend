import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { RoomServiceType } from "../../application/services/room.service.js";
import { roomIdParamSchema } from "../schemas/room.schemas.js";
import { BadRequestException } from "../../shared/exceptions/business.exception.js";

export const createRoomController = (
  getRooms: RoomServiceType["getRooms"],
  getRoom: RoomServiceType["getRoom"],
) => {
  const router = Router();

  // GET /api/rooms — 랜딩 페이지의 연습실 카드를 채우는 공개 API
  router.get("/", async (req: Request, res: Response, next: NextFunction) => {
    const rooms = await getRooms();

    res.json({ rooms });
  });

  // GET /api/rooms/:id
  router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
    const { success, data, error } = roomIdParamSchema.safeParse(req.params);
    if (!success) {
      throw new BadRequestException(z.prettifyError(error));
    }

    const room = await getRoom(data.id);

    res.json({ room });
  });

  return { router };
};
