import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { RoomServiceType } from "../../application/services/room.service.js";
import {
  registerRoomDataSchema,
  roomIdParamSchema,
  roomSearchQuerySchema,
} from "../schemas/room.schemas.js";
import { AuthMiddlewareType } from "../middlewares/auth.middleware.js";
import { BadRequestException } from "../../shared/exceptions/business.exception.js";

export const createRoomController = (
  searchRooms: RoomServiceType["searchRooms"],
  getRoom: RoomServiceType["getRoom"],
  getRegions: RoomServiceType["getRegions"],
  registerRoom: RoomServiceType["registerRoom"],
  deleteRoom: RoomServiceType["deleteRoom"],
  authMiddleware: AuthMiddlewareType,
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

  // POST /api/rooms — 연습실·합주실 등록. 로그인해야 한다.
  router.post(
    "/",
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      const { success, data, error } = registerRoomDataSchema.safeParse(
        req.body,
      );
      if (!success) {
        throw new BadRequestException(z.prettifyError(error));
      }

      // 등록자는 요청 본문이 아니라 토큰에서 가져온다. 남의 이름으로 등록할 수 없어야 한다.
      const room = await registerRoom({ ...data, ownerId: req.userId! });

      res.status(201).json({ room });
    },
  );

  // DELETE /api/rooms/:id — 등록자 본인만. 크롤링 시드는 주인이 없어 아무도 못 지운다.
  router.delete(
    "/:id",
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      const { success, data, error } = roomIdParamSchema.safeParse(req.params);
      if (!success) {
        throw new BadRequestException(z.prettifyError(error));
      }

      await deleteRoom({ roomId: data.id, userId: req.userId! });

      res.json({ message: "연습실을 삭제했습니다." });
    },
  );

  return { router };
};
