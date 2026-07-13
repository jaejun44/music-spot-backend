import { User } from "../../generated/prisma/client.js";

/** 비밀번호 해시가 빠진, 외부에 내보내도 안전한 사용자 표현 */
export type PublicUser = {
  id: number;
  email: string;
  username: string;
};

/**
 * 이메일은 대소문자를 구분하지 않는다.
 * "ASD@asd.com"으로 가입한 뒤 "asd@asd.com"으로 다시 가입하는 것을 막기 위해
 * 저장·조회 양쪽 모두 이 함수를 통과한 값을 쓴다.
 */
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** 응답에서 password 해시를 제거한다. 이 함수를 거치지 않은 User는 밖으로 내보내지 않는다. */
export const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  email: user.email,
  username: user.username,
});
