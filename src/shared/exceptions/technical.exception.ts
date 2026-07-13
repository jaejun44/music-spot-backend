export enum TechnicalExceptionCode {
  JWT_VERIFY_FAILED = "JWT_VERIFY_FAILED",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  UNAUTHORIZED = "UNAUTHORIZED",
  EMAIL_DUPLICATED = "EMAIL_DUPLICATED",
  AUTHOR_NOT_FOUND = "AUTHOR_NOT_FOUND",
}

/**
 * 사용자에게 노출하면 안 되는 시스템 내부 예외.
 * (DB 제약 위반, JWT 서명 오류 등)
 * 서비스 레이어에서 잡아 BusinessException으로 번역하는 것이 원칙이다.
 */
export class TechnicalException extends Error {
  code: TechnicalExceptionCode;
  originalErr: unknown;

  constructor(
    message: string,
    code: TechnicalExceptionCode,
    originalErr?: unknown,
  ) {
    super(message);
    this.code = code;
    this.originalErr = originalErr;
  }
}
