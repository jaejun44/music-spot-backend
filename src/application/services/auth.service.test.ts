import { jest, describe, test, expect } from "@jest/globals";
import { createAuthService } from "./auth.service.js";
import type { IUserRepo } from "../contracts/user-repo.contract.js";
import type { IJwtUtil } from "../../shared/contracts/jwt-util.contract.js";
import type { IHashUtil } from "../../shared/contracts/hash-util.contract.js";
import type { User } from "../../generated/prisma/client.js";
import { BusinessException } from "../../shared/exceptions/business.exception.js";
import { catchBusinessException } from "../../shared/testing/catch-error.js";
import {
  TechnicalException,
  TechnicalExceptionCode,
} from "../../shared/exceptions/technical.exception.js";

const 저장된유저: User = {
  id: 1,
  email: "asd@asd.com",
  password: "hashed_password",
  username: "재준",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

/**
 * 가짜 의존성을 한 번에 만들어 준다.
 * 각 테스트는 필요한 것만 골라 덮어쓴다.
 */
const 가짜의존성만들기 = (overrides?: {
  findUserByEmail?: User | null;
  createUser?: User;
  token?: string;
  compare?: boolean;
  hash?: string;
}) => {
  const findUserByEmail = jest
    .fn<IUserRepo["findUserByEmail"]>()
    .mockResolvedValue(overrides?.findUserByEmail ?? null);
  const createUser = jest
    .fn<IUserRepo["createUser"]>()
    .mockResolvedValue(overrides?.createUser ?? 저장된유저);
  const signJwt = jest
    .fn<IJwtUtil["signJwt"]>()
    .mockReturnValue(overrides?.token ?? "fake-token");
  const hashUtil: IHashUtil = {
    hash: jest
      .fn<IHashUtil["hash"]>()
      .mockResolvedValue(overrides?.hash ?? "hashed_password"),
    compare: jest
      .fn<IHashUtil["compare"]>()
      .mockResolvedValue(overrides?.compare ?? true),
  };

  return { findUserByEmail, createUser, signJwt, hashUtil };
};

const 서비스만들기 = (deps: ReturnType<typeof 가짜의존성만들기>) =>
  createAuthService(
    deps.findUserByEmail,
    deps.createUser,
    deps.signJwt,
    deps.hashUtil,
  );

describe("로그인(signIn)", () => {
  test("이메일과 비밀번호가 맞으면 토큰과 공개 유저 정보를 돌려준다", async () => {
    const deps = 가짜의존성만들기({
      findUserByEmail: 저장된유저,
      compare: true,
      token: "signed-token",
    });
    const { signIn } = 서비스만들기(deps);

    const result = await signIn({ email: "asd@asd.com", password: "1234" });

    expect(result.token).toBe("signed-token");
    expect(result.user).toEqual({
      id: 1,
      email: "asd@asd.com",
      username: "재준",
    });
    expect(deps.findUserByEmail).toHaveBeenCalledWith("asd@asd.com");
    expect(deps.hashUtil.compare).toHaveBeenCalledWith({
      password: "1234",
      hashedPassword: "hashed_password",
    });
    expect(deps.signJwt).toHaveBeenCalledWith({
      data: { userId: 1 },
      expiresIn: 3600,
    });
  });

  test("응답에 비밀번호 해시를 절대 포함하지 않는다", async () => {
    const deps = 가짜의존성만들기({ findUserByEmail: 저장된유저, compare: true });
    const { signIn } = 서비스만들기(deps);

    const result = await signIn({ email: "asd@asd.com", password: "1234" });

    expect(result.user).not.toHaveProperty("password");
    expect(JSON.stringify(result)).not.toContain("hashed_password");
  });

  test("대문자·공백이 섞인 이메일도 정규화해서 조회한다", async () => {
    const deps = 가짜의존성만들기({ findUserByEmail: 저장된유저, compare: true });
    const { signIn } = 서비스만들기(deps);

    await signIn({ email: "  ASD@ASD.COM  ", password: "1234" });

    expect(deps.findUserByEmail).toHaveBeenCalledWith("asd@asd.com");
  });

  test("가입되지 않은 이메일이면 401을 던지고 토큰을 발급하지 않는다", async () => {
    const deps = 가짜의존성만들기({ findUserByEmail: null });
    const { signIn } = 서비스만들기(deps);

    await expect(
      signIn({ email: "nobody@asd.com", password: "1234" }),
    ).rejects.toThrow("이메일 또는 비밀번호가 일치하지 않습니다.");
    expect(deps.signJwt).not.toHaveBeenCalled();
  });

  test("비밀번호가 틀리면 401을 던지고 토큰을 발급하지 않는다", async () => {
    const deps = 가짜의존성만들기({
      findUserByEmail: 저장된유저,
      compare: false,
    });
    const { signIn } = 서비스만들기(deps);

    await expect(
      signIn({ email: "asd@asd.com", password: "wrong" }),
    ).rejects.toThrow("이메일 또는 비밀번호가 일치하지 않습니다.");
    expect(deps.signJwt).not.toHaveBeenCalled();
  });

  test("계정 없음과 비밀번호 틀림은 구분되지 않는 같은 메시지·같은 상태코드로 응답한다", async () => {
    // 메시지가 갈리면 "그 이메일은 가입되어 있다"는 사실이 새어나간다.
    const 계정없음 = 서비스만들기(가짜의존성만들기({ findUserByEmail: null }));
    const 비번틀림 = 서비스만들기(
      가짜의존성만들기({ findUserByEmail: 저장된유저, compare: false }),
    );

    const err1 = await catchBusinessException(() =>
      계정없음.signIn({ email: "a@a.com", password: "1234" }),
    );
    const err2 = await catchBusinessException(() =>
      비번틀림.signIn({ email: "asd@asd.com", password: "1234" }),
    );

    expect(err1.message).toBe(err2.message);
    expect(err1.statusCode).toBe(401);
    expect(err2.statusCode).toBe(401);
  });

  test("findUserByEmail이 undefined를 반환해도(계약 위반) 안전하게 401로 처리한다", async () => {
    const deps = 가짜의존성만들기();
    deps.findUserByEmail.mockResolvedValue(undefined as never);
    const { signIn } = 서비스만들기(deps);

    await expect(
      signIn({ email: "asd@asd.com", password: "1234" }),
    ).rejects.toThrow("이메일 또는 비밀번호가 일치하지 않습니다.");
  });

  test("DB 조회가 실패하면 에러를 그대로 전파한다 (500으로 처리되도록)", async () => {
    const deps = 가짜의존성만들기();
    deps.findUserByEmail.mockRejectedValue(new Error("DB 연결 실패"));
    const { signIn } = 서비스만들기(deps);

    await expect(
      signIn({ email: "asd@asd.com", password: "1234" }),
    ).rejects.toThrow("DB 연결 실패");
    expect(deps.signJwt).not.toHaveBeenCalled();
  });

  test("bcrypt 비교가 실패하면 에러를 전파한다", async () => {
    const deps = 가짜의존성만들기({ findUserByEmail: 저장된유저 });
    deps.hashUtil.compare = jest
      .fn<IHashUtil["compare"]>()
      .mockRejectedValue(new Error("bcrypt 비교 실패"));
    const { signIn } = 서비스만들기(deps);

    await expect(
      signIn({ email: "asd@asd.com", password: "1234" }),
    ).rejects.toThrow("bcrypt 비교 실패");
    expect(deps.signJwt).not.toHaveBeenCalled();
  });

  test("JWT 서명이 실패하면 에러를 전파한다", async () => {
    const deps = 가짜의존성만들기({ findUserByEmail: 저장된유저, compare: true });
    deps.signJwt.mockImplementation(() => {
      throw new Error("JWT 서명 실패");
    });
    const { signIn } = 서비스만들기(deps);

    await expect(
      signIn({ email: "asd@asd.com", password: "1234" }),
    ).rejects.toThrow("JWT 서명 실패");
  });

  test("빈 비밀번호도 해시 비교를 거치며, 통과하지 못한다", async () => {
    const deps = 가짜의존성만들기({
      findUserByEmail: 저장된유저,
      compare: false,
    });
    const { signIn } = 서비스만들기(deps);

    await expect(signIn({ email: "asd@asd.com", password: "" })).rejects.toThrow(
      "이메일 또는 비밀번호가 일치하지 않습니다.",
    );
    expect(deps.hashUtil.compare).toHaveBeenCalledWith({
      password: "",
      hashedPassword: "hashed_password",
    });
  });
});

describe("회원가입(signUp)", () => {
  const 새유저: User = {
    id: 2,
    email: "new@asd.com",
    password: "hashed_password",
    username: "민수",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  test("새 이메일이면 비밀번호를 해시해 저장하고 토큰을 발급한다", async () => {
    const deps = 가짜의존성만들기({
      findUserByEmail: null,
      createUser: 새유저,
      token: "new-token",
      hash: "hashed_password",
    });
    const { signUp } = 서비스만들기(deps);

    const result = await signUp({
      email: "new@asd.com",
      password: "5678",
      username: "민수",
    });

    expect(result.token).toBe("new-token");
    expect(result.user).toEqual({
      id: 2,
      email: "new@asd.com",
      username: "민수",
    });
    expect(deps.hashUtil.hash).toHaveBeenCalledWith({
      password: "5678",
      saltRounds: 10,
    });
    expect(deps.signJwt).toHaveBeenCalledWith({
      data: { userId: 2 },
      expiresIn: 3600,
    });
  });

  test("평문 비밀번호를 그대로 저장하지 않는다", async () => {
    const deps = 가짜의존성만들기({
      findUserByEmail: null,
      createUser: 새유저,
      hash: "hashed_password",
    });
    const { signUp } = 서비스만들기(deps);

    await signUp({ email: "new@asd.com", password: "5678", username: "민수" });

    expect(deps.createUser).toHaveBeenCalledWith({
      email: "new@asd.com",
      password: "hashed_password",
      username: "민수",
    });
    const 저장된인자 = deps.createUser.mock.calls[0]![0];
    expect(저장된인자.password).not.toBe("5678");
  });

  test("이메일을 정규화해서 중복 검사하고 정규화된 값으로 저장한다", async () => {
    const deps = 가짜의존성만들기({ findUserByEmail: null, createUser: 새유저 });
    const { signUp } = 서비스만들기(deps);

    await signUp({
      email: "  NEW@ASD.COM ",
      password: "5678",
      username: "민수",
    });

    expect(deps.findUserByEmail).toHaveBeenCalledWith("new@asd.com");
    expect(deps.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: "new@asd.com" }),
    );
  });

  test("이미 가입된 이메일이면 409를 던지고 저장을 시도하지 않는다", async () => {
    const deps = 가짜의존성만들기({ findUserByEmail: 저장된유저 });
    const { signUp } = 서비스만들기(deps);

    const err = await catchBusinessException(() =>
      signUp({ email: "asd@asd.com", password: "1234", username: "재준" }),
    );

    expect(err).toBeInstanceOf(BusinessException);
    expect(err.message).toBe("이미 가입된 이메일입니다.");
    expect(err.statusCode).toBe(409);
    expect(deps.createUser).not.toHaveBeenCalled();
    expect(deps.signJwt).not.toHaveBeenCalled();
  });

  test("사전 조회를 통과했지만 DB unique 제약에 걸리면(동시 가입) 409로 번역한다", async () => {
    // 두 요청이 동시에 들어오면 둘 다 사전 조회를 통과할 수 있다.
    // 최종 방어선인 DB 제약 위반을 사용자가 이해할 수 있는 메시지로 바꿔야 한다.
    const deps = 가짜의존성만들기({ findUserByEmail: null });
    deps.createUser.mockRejectedValue(
      new TechnicalException(
        "Unique constraint failed",
        TechnicalExceptionCode.EMAIL_DUPLICATED,
      ),
    );
    const { signUp } = 서비스만들기(deps);

    const err = await catchBusinessException(() =>
      signUp({ email: "race@asd.com", password: "1234", username: "동시" }),
    );

    expect(err).toBeInstanceOf(BusinessException);
    expect(err.message).toBe("이미 가입된 이메일입니다.");
    expect(err.statusCode).toBe(409);
    expect(deps.signJwt).not.toHaveBeenCalled();
  });

  test("EMAIL_DUPLICATED가 아닌 TechnicalException은 번역하지 않고 그대로 전파한다", async () => {
    const deps = 가짜의존성만들기({ findUserByEmail: null });
    deps.createUser.mockRejectedValue(
      new TechnicalException("알 수 없음", TechnicalExceptionCode.UNAUTHORIZED),
    );
    const { signUp } = 서비스만들기(deps);

    await expect(
      signUp({ email: "a@a.com", password: "1234", username: "a" }),
    ).rejects.toBeInstanceOf(TechnicalException);
  });

  test("해시 생성이 실패하면 저장하지 않고 에러를 전파한다", async () => {
    const deps = 가짜의존성만들기({ findUserByEmail: null });
    deps.hashUtil.hash = jest
      .fn<IHashUtil["hash"]>()
      .mockRejectedValue(new Error("bcrypt 해시 실패"));
    const { signUp } = 서비스만들기(deps);

    await expect(
      signUp({ email: "a@a.com", password: "1234", username: "a" }),
    ).rejects.toThrow("bcrypt 해시 실패");
    expect(deps.createUser).not.toHaveBeenCalled();
    expect(deps.signJwt).not.toHaveBeenCalled();
  });

  test("중복 조회 중 DB가 실패하면 에러를 전파한다", async () => {
    const deps = 가짜의존성만들기();
    deps.findUserByEmail.mockRejectedValue(new Error("DB 조회 실패"));
    const { signUp } = 서비스만들기(deps);

    await expect(
      signUp({ email: "a@a.com", password: "1234", username: "a" }),
    ).rejects.toThrow("DB 조회 실패");
    expect(deps.createUser).not.toHaveBeenCalled();
  });

  test("저장은 됐지만 JWT 서명이 실패하면 에러를 전파한다", async () => {
    const deps = 가짜의존성만들기({ findUserByEmail: null, createUser: 새유저 });
    deps.signJwt.mockImplementation(() => {
      throw new Error("JWT 서명 실패");
    });
    const { signUp } = 서비스만들기(deps);

    await expect(
      signUp({ email: "new@asd.com", password: "1234", username: "민수" }),
    ).rejects.toThrow("JWT 서명 실패");
  });
});
