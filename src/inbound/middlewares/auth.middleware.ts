import { Request, Response, NextFunction } from "express";
import { IJwtUtil } from "../../shared/contracts/jwt-util.contract.js";
import { UnauthorizedException } from "../../shared/exceptions/business.exception.js";
import {
  TechnicalException,
  TechnicalExceptionCode,
} from "../../shared/exceptions/technical.exception.js";

export const createAuthMiddleware = (verifyJwt: IJwtUtil["verifyJwt"]) => {
  const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // 1. Authorization 헤더에서 Bearer 토큰을 꺼낸다.
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new UnauthorizedException("로그인이 필요합니다."));
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (token.length === 0) {
      return next(new UnauthorizedException("로그인이 필요합니다."));
    }

    // 2. 서명과 만료기간을 검증하고 userId를 요청에 실어 보낸다.
    try {
      const decoded = verifyJwt(token) as { userId?: number };

      if (typeof decoded?.userId !== "number") {
        return next(new UnauthorizedException("유효하지 않은 토큰입니다."));
      }

      req.userId = decoded.userId;
      return next();
    } catch (err) {
      if (err instanceof TechnicalException) {
        if (err.code === TechnicalExceptionCode.TOKEN_EXPIRED) {
          return next(
            new UnauthorizedException(
              "세션이 만료되었습니다. 다시 로그인 해주세요.",
            ),
          );
        }
        if (err.code === TechnicalExceptionCode.JWT_VERIFY_FAILED) {
          return next(new UnauthorizedException("유효하지 않은 토큰입니다."));
        }
      }

      return next(err);
    }
  };

  return authMiddleware;
};

export type AuthMiddlewareType = ReturnType<typeof createAuthMiddleware>;
