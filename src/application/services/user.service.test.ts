import { jest, describe, test, expect } from "@jest/globals";
import { createUserService } from "./user.service.js";
import type { IUserRepo } from "../contracts/user-repo.contract.js";
import type { User } from "../../generated/prisma/client.js";
import { BusinessException } from "../../shared/exceptions/business.exception.js";

const 저장된유저: User = {
  id: 1,
  email: "asd@asd.com",
  password: "hashed_password",
  username: "재준",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("내 정보 조회(getMe)", () => {
  test("존재하는 유저면 공개 정보를 돌려준다", async () => {
    const findUserById = jest
      .fn<IUserRepo["findUserById"]>()
      .mockResolvedValue(저장된유저);
    const { getMe } = createUserService(findUserById);

    const me = await getMe(1);

    expect(me).toEqual({ id: 1, email: "asd@asd.com", username: "재준" });
    expect(findUserById).toHaveBeenCalledWith(1);
  });

  test("비밀번호 해시를 응답에 포함하지 않는다", async () => {
    const findUserById = jest
      .fn<IUserRepo["findUserById"]>()
      .mockResolvedValue(저장된유저);
    const { getMe } = createUserService(findUserById);

    const me = await getMe(1);

    expect(me).not.toHaveProperty("password");
    expect(JSON.stringify(me)).not.toContain("hashed_password");
  });

  test("토큰은 유효하지만 유저가 사라졌으면 404를 던진다", async () => {
    // DB가 초기화됐거나 탈퇴한 뒤에도 예전 토큰은 만료 전까지 유효하다.
    const findUserById = jest
      .fn<IUserRepo["findUserById"]>()
      .mockResolvedValue(null);
    const { getMe } = createUserService(findUserById);

    const err = await getMe(999).catch((e) => e as BusinessException);

    expect(err).toBeInstanceOf(BusinessException);
    expect(err.message).toBe("존재하지 않는 유저입니다.");
    expect(err.statusCode).toBe(404);
  });

  test("repo가 undefined를 반환해도(계약 위반) 404로 처리한다", async () => {
    const findUserById = jest
      .fn<IUserRepo["findUserById"]>()
      .mockResolvedValue(undefined as never);
    const { getMe } = createUserService(findUserById);

    await expect(getMe(1)).rejects.toThrow("존재하지 않는 유저입니다.");
  });

  test("DB 조회가 실패하면 에러를 그대로 전파한다", async () => {
    const findUserById = jest
      .fn<IUserRepo["findUserById"]>()
      .mockRejectedValue(new Error("DB 연결 실패"));
    const { getMe } = createUserService(findUserById);

    await expect(getMe(1)).rejects.toThrow("DB 연결 실패");
  });
});
