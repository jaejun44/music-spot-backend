import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { RoomServiceType } from "../../application/services/room.service.js";
import {
  roomIdParamSchema,
  roomSearchQuerySchema,
} from "../schemas/room.schemas.js";
import { BadRequestException } from "../../shared/exceptions/business.exception.js";

export const createRoomController = (
  searchRooms: RoomServiceType["searchRooms"],
  getRoom: RoomServiceType["getRoom"],
  getRegions: RoomServiceType["getRegions"],
) => {
  const router = Router();

  // GET /api/rooms?sido=서울&gungu=마포구&category=합주실&keyword=드럼&page=1&size=12
  router.get("/", async (req: Request, res: Response, next: NextFunction) => {
    const { success, data, error } = roomSearchQuerySchema.safeParse(req.query);
    if (!success) {
      throw new BadRequestException(z.prettifyError(error));
    }

    const result = await searchRooms(data);

    res.json(result);
  });

  // GET /api/rooms/regions — 지역 드롭다운 데이터.
  // "/:id"보다 먼저 선언해야 한다. 뒤에 두면 "regions"가 id 자리로 잡혀 400이 난다.
  router.get(
    "/regions",
    async (req: Request, res: Response, next: NextFunction) => {
      const regions = await getRegions();

      res.json({ regions });
    },
  );

  // GET /api/rooms/:id
  router.get(
    "/:id",
    async (req: Request, res: Response, next: NextFunction) => {
      const { success, data, error } = roomIdParamSchema.safeParse(req.params);
      if (!success) {
        throw new BadRequestException(z.prettifyError(error));
      }

      const room = await getRoom(data.id);

      res.json({ room });
    },
  );

  return { router };
};
