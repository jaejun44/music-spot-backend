import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AuthServiceType } from "../../application/services/auth.service.js";
import { signInDataSchema, signUpDataSchema } from "../schemas/auth.schemas.js";
import { BadRequestException } from "../../shared/exceptions/business.exception.js";

export const createAuthController = (
  signIn: AuthServiceType["signIn"],
  signUp: AuthServiceType["signUp"],
) => {
  const router = Router();

  // POST /api/auth/signup — 회원가입 후 곧바로 토큰을 발급한다.
  router.post(
    "/signup",
    async (req: Request, res: Response, next: NextFunction) => {
      const { success, data, error } = signUpDataSchema.safeParse(req.body);
      if (!success) {
        throw new BadRequestException(z.prettifyError(error));
      }

      const { token, user } = await signUp(data);

      res.status(201).json({ token, user });
    },
  );

  // POST /api/auth/signin
  router.post(
    "/signin",
    async (req: Request, res: Response, next: NextFunction) => {
      const { success, data, error } = signInDataSchema.safeParse(req.body);
      if (!success) {
        throw new BadRequestException(z.prettifyError(error));
      }

      const { token, user } = await signIn(data);

      res.json({ token, user });
    },
  );

  // POST /api/auth/signout
  // JWT는 서버에 상태가 없으므로 실제 폐기는 클라이언트가 토큰을 버리는 것으로 이뤄진다.
  // 프론트가 호출할 대상을 남겨두기 위해 엔드포인트만 제공한다.
  router.post("/signout", (req: Request, res: Response) => {
    res.json({ message: "로그아웃되었습니다." });
  });

  return { router };
};
