import { Router, Request, Response, NextFunction } from "express";
import { UserServiceType } from "../../application/services/user.service.js";
import { AuthMiddlewareType } from "../middlewares/auth.middleware.js";

export const createUserController = (
  getMe: UserServiceType["getMe"],
  authMiddleware: AuthMiddlewareType,
) => {
  const router = Router();

  // GET /api/users/me — 토큰이 있어야만 접근할 수 있는 보호된 엔드포인트
  router.get(
    "/me",
    authMiddleware,
    async (req: Request, res: Response, next: NextFunction) => {
      const me = await getMe(req.userId!);

      res.json({ me });
    },
  );

  return { router };
};
