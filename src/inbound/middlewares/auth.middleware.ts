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

/**
 * 로그인해도 되고 안 해도 되는 요청용.
 *
 * 커뮤니티 목록은 누구나 본다. 다만 로그인한 사람에게는 "내가 좋아요를 눌렀는지"까지 보여줘야 한다.
 * 그래서 토큰이 있으면 읽어 userId를 실어주고, 없거나 상해 있으면 **막지 않고 그냥 통과시킨다.**
 * (막아버리면 비로그인 사용자가 글을 아예 못 본다)
 */
export const createOptionalAuthMiddleware = (
  verifyJwt: IJwtUtil["verifyJwt"],
) => {
  const optionalAuthMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return next();
    }

    try {
      const decoded = verifyJwt(authHeader.slice("Bearer ".length).trim()) as {
        userId?: number;
      };

      if (typeof decoded?.userId === "number") {
        req.userId = decoded.userId;
      }
    } catch {
      // 토큰이 만료됐거나 위조됐다. 로그인 안 한 사람과 똑같이 대한다.
    }

    return next();
  };

  return optionalAuthMiddleware;
};

export type OptionalAuthMiddlewareType = ReturnType<
  typeof createOptionalAuthMiddleware
>;
