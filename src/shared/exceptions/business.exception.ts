/**
 * 클라이언트가 이해하고 대응할 수 있는 예외.
 * message는 그대로 사용자에게 노출되므로 사람이 읽을 수 있는 문장이어야 한다.
 *
 * statusCode를 생략하면 401(인증 실패)로 취급한다.
 */
export class BusinessException extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.statusCode = statusCode;
  }
}

/** 잘못된 입력값 (검증 실패) */
export class BadRequestException extends BusinessException {
  constructor(message: string) {
    super(message, 400);
  }
}

/** 인증 실패 / 토큰 없음·만료 */
export class UnauthorizedException extends BusinessException {
  constructor(message: string) {
    super(message, 401);
  }
}

/** 존재하지 않는 리소스 */
export class NotFoundException extends BusinessException {
  constructor(message: string) {
    super(message, 404);
  }
}

/** 이미 존재하는 리소스 (이메일 중복 등) */
export class ConflictException extends BusinessException {
  constructor(message: string) {
    super(message, 409);
  }
}
