import { jest, describe, test, expect } from "@jest/globals";
import type { Request, Response, NextFunction } from "express";
import { createAuthMiddleware } from "./auth.middleware.js";
import type { IJwtUtil } from "../../shared/contracts/jwt-util.contract.js";
import { BusinessException } from "../../shared/exceptions/business.exception.js";
import {
  TechnicalException,
  TechnicalExceptionCode,
} from "../../shared/exceptions/technical.exception.js";

const 요청만들기 = (authorization?: string) =>
  ({ headers: authorization ? { authorization } : {} }) as Request;

const 응답만들기 = () => ({}) as Response;

/** next(err) 로 넘어온 에러를 꺼내 준다. 에러 없이 통과했으면 null. */
const next호출결과 = (next: jest.Mock) => {
  const arg = next.mock.calls[0]?.[0];
  return arg instanceof Error ? arg : null;
};

describe("인증 미들웨어", () => {
  test("유효한 Bearer 토큰이면 req.userId를 채우고 통과시킨다", () => {
    const verifyJwt = jest
      .fn<IJwtUtil["verifyJwt"]>()
      .mockReturnValue({ userId: 7 });
    const authMiddleware = createAuthMiddleware(verifyJwt);
    const req = 요청만들기("Bearer valid-token");
    const next = jest.fn() as unknown as NextFunction & jest.Mock;

    authMiddleware(req, 응답만들기(), next);

    expect(verifyJwt).toHaveBeenCalledWith("valid-token");
    expect(req.userId).toBe(7);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next호출결과(next as jest.Mock)).toBeNull();
  });

  test("Authorization 헤더가 없으면 401로 막는다", () => {
    const verifyJwt = jest.fn<IJwtUtil["verifyJwt"]>();
    const authMiddleware = createAuthMiddleware(verifyJwt);
    const next = jest.fn() as unknown as NextFunction & jest.Mock;

    authMiddleware(요청만들기(), 응답만들기(), next);

    const err = next호출결과(next as jest.Mock) as BusinessException;
    expect(err).toBeInstanceOf(BusinessException);
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("로그인이 필요합니다.");
    expect(verifyJwt).not.toHaveBeenCalled();
  });

  test("Bearer 접두사가 없으면 401로 막는다", () => {
    const verifyJwt = jest.fn<IJwtUtil["verifyJwt"]>();
    const authMiddleware = createAuthMiddleware(verifyJwt);
    const next = jest.fn() as unknown as NextFunction & jest.Mock;

    authMiddleware(요청만들기("some-token"), 응답만들기(), next);

    const err = next호출결과(next as jest.Mock) as BusinessException;
    expect(err.statusCode).toBe(401);
    expect(verifyJwt).not.toHaveBeenCalled();
  });

  test("Bearer 뒤가 비어 있으면 401로 막는다", () => {
    const verifyJwt = jest.fn<IJwtUtil["verifyJwt"]>();
    const authMiddleware = createAuthMiddleware(verifyJwt);
    const next = jest.fn() as unknown as NextFunction & jest.Mock;

    authMiddleware(요청만들기("Bearer    "), 응답만들기(), next);

    const err = next호출결과(next as jest.Mock) as BusinessException;
    expect(err.statusCode).toBe(401);
    expect(verifyJwt).not.toHaveBeenCalled();
  });

  test("서명이 위조된 토큰이면 '유효하지 않은 토큰' 401로 막는다", () => {
    const verifyJwt = jest
      .fn<IJwtUtil["verifyJwt"]>()
      .mockImplementation(() => {
        throw new TechnicalException(
          "invalid signature",
          TechnicalExceptionCode.JWT_VERIFY_FAILED,
        );
      });
    const authMiddleware = createAuthMiddleware(verifyJwt);
    const next = jest.fn() as unknown as NextFunction & jest.Mock;

    authMiddleware(요청만들기("Bearer forged"), 응답만들기(), next);

    const err = next호출결과(next as jest.Mock) as BusinessException;
    expect(err).toBeInstanceOf(BusinessException);
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("유효하지 않은 토큰입니다.");
  });

  test("만료된 토큰이면 다시 로그인하라는 401로 막는다", () => {
    const verifyJwt = jest
      .fn<IJwtUtil["verifyJwt"]>()
      .mockImplementation(() => {
        throw new TechnicalException(
          "jwt expired",
          TechnicalExceptionCode.TOKEN_EXPIRED,
        );
      });
    const authMiddleware = createAuthMiddleware(verifyJwt);
    const next = jest.fn() as unknown as NextFunction & jest.Mock;

    authMiddleware(요청만들기("Bearer expired"), 응답만들기(), next);

    const err = next호출결과(next as jest.Mock) as BusinessException;
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("세션이 만료되었습니다. 다시 로그인 해주세요.");
  });

  test("만료와 위조는 서로 다른 메시지로 안내한다 (사용자가 취할 행동이 다르다)", () => {
    const 만료 = createAuthMiddleware(
      jest.fn<IJwtUtil["verifyJwt"]>().mockImplementation(() => {
        throw new TechnicalException(
          "expired",
          TechnicalExceptionCode.TOKEN_EXPIRED,
        );
      }),
    );
    const 위조 = createAuthMiddleware(
      jest.fn<IJwtUtil["verifyJwt"]>().mockImplementation(() => {
        throw new TechnicalException(
          "invalid",
          TechnicalExceptionCode.JWT_VERIFY_FAILED,
        );
      }),
    );

    const next1 = jest.fn() as unknown as NextFunction & jest.Mock;
    const next2 = jest.fn() as unknown as NextFunction & jest.Mock;
    만료(요청만들기("Bearer a"), 응답만들기(), next1);
    위조(요청만들기("Bearer b"), 응답만들기(), next2);

    expect((next호출결과(next1 as jest.Mock) as Error).message).not.toBe(
      (next호출결과(next2 as jest.Mock) as Error).message,
    );
  });

  test("payload에 userId가 없으면 401로 막는다", () => {
    // 다른 용도로 서명된 토큰이 흘러들어온 경우
    const verifyJwt = jest
      .fn<IJwtUtil["verifyJwt"]>()
      .mockReturnValue({ sub: "someone" });
    const authMiddleware = createAuthMiddleware(verifyJwt);
    const req = 요청만들기("Bearer valid-but-wrong-payload");
    const next = jest.fn() as unknown as NextFunction & jest.Mock;

    authMiddleware(req, 응답만들기(), next);

    const err = next호출결과(next as jest.Mock) as BusinessException;
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("유효하지 않은 토큰입니다.");
    expect(req.userId).toBeUndefined();
  });

  test("userId가 숫자가 아니면 401로 막는다", () => {
    const verifyJwt = jest
      .fn<IJwtUtil["verifyJwt"]>()
      .mockReturnValue({ userId: "1" });
    const authMiddleware = createAuthMiddleware(verifyJwt);
    const req = 요청만들기("Bearer string-userid");
    const next = jest.fn() as unknown as NextFunction & jest.Mock;

    authMiddleware(req, 응답만들기(), next);

    const err = next호출결과(next as jest.Mock) as BusinessException;
    expect(err.statusCode).toBe(401);
    expect(req.userId).toBeUndefined();
  });

  test("예상하지 못한 에러는 삼키지 않고 그대로 next로 넘긴다", () => {
    const unknownError = new Error("알 수 없는 에러");
    const verifyJwt = jest
      .fn<IJwtUtil["verifyJwt"]>()
      .mockImplementation(() => {
        throw unknownError;
      });
    const authMiddleware = createAuthMiddleware(verifyJwt);
    const next = jest.fn() as unknown as NextFunction & jest.Mock;

    authMiddleware(요청만들기("Bearer x"), 응답만들기(), next);

    expect(next호출결과(next as jest.Mock)).toBe(unknownError);
  });
});
