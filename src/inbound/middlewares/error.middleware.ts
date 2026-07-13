import { Request, Response, NextFunction } from "express";
import {
  BusinessException,
  NotFoundException,
} from "../../shared/exceptions/business.exception.js";
import { TechnicalException } from "../../shared/exceptions/technical.exception.js";
import { env } from "../../shared/config/env.js";

/** 어떤 라우터에도 걸리지 않은 요청 */
export const notFoundMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  next(
    new NotFoundException(
      `존재하지 않는 API입니다. (${req.method} ${req.path})`,
    ),
  );
};

/**
 * 모든 에러의 종착지.
 * BusinessException은 statusCode와 메시지를 그대로 클라이언트에 내려주고,
 * 그 외(TechnicalException 포함)는 내부 사정을 감추고 500으로 뭉뚱그린다.
 */
export const errorMiddleware = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof BusinessException) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  // 여기까지 온 것은 우리가 예상하지 못한 에러다. 반드시 로그로 남긴다.
  if (err instanceof TechnicalException) {
    console.error(
      `[TechnicalException:${err.code}]`,
      err.message,
      err.originalErr,
    );
  } else {
    console.error("[UnknownError]", err);
  }

  res.status(500).json({
    message: "알 수 없는 에러가 발생했어요. 잠시 뒤에 다시 시도해주세요.",
    // 개발 중에는 원인을 바로 볼 수 있게 하되, 배포 환경에서는 절대 노출하지 않는다.
    ...(env.isProduction
      ? {}
      : { detail: err instanceof Error ? err.message : String(err) }),
  });
};
